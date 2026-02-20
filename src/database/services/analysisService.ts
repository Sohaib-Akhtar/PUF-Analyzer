import Database from 'better-sqlite3';
import {
  PufAnalysisResult,
  PufAnalysisFile,
  CreatePufAnalysisDto,
  CreatePufAnalysisFileDto,
  AnalysisWithFiles
} from '../../shared/types/database';

export class AnalysisService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  createAnalysis(data: CreatePufAnalysisDto): PufAnalysisResult {
    const stmt = this.db.prepare(`
      INSERT INTO puf_analysis_results (device_id, analysis_type, parameters, result_data, execution_time, files_used, status)
      VALUES (?, ?, ?, ?, ?, ?, 'completed')
    `);

    const result = stmt.run(
      data.device_id,
      data.analysis_type,
      JSON.stringify(data.parameters),
      JSON.stringify(data.result_data),
      data.execution_time,
      JSON.stringify(data.files_used)
    );

    return this.getAnalysisById(result.lastInsertRowid as number)!;
  }

  createAnalysisFile(data: CreatePufAnalysisFileDto): PufAnalysisFile {
    const stmt = this.db.prepare(`
      INSERT INTO puf_analysis_files (analysis_id, filename, file_size, file_hash)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.analysis_id,
      data.filename,
      data.file_size,
      data.file_hash
    );

    return this.getAnalysisFileById(result.lastInsertRowid as number)!;
  }

  createAnalysisWithFiles(
    data: CreatePufAnalysisDto,
    files: Omit<CreatePufAnalysisFileDto, 'analysis_id'>[]
  ): AnalysisWithFiles {
    const transaction = this.db.transaction(() => {
      const analysis = this.createAnalysis(data);

      const analysisFiles: PufAnalysisFile[] = [];
      for (const file of files) {
        const analysisFile = this.createAnalysisFile({
          analysis_id: analysis.id,
          ...file
        });
        analysisFiles.push(analysisFile);
      }

      return { ...analysis, files: analysisFiles };
    });

    return transaction();
  }

  getAnalysisById(id: number): PufAnalysisResult | undefined {
    const stmt = this.db.prepare('SELECT * FROM puf_analysis_results WHERE id = ?');
    return stmt.get(id) as PufAnalysisResult | undefined;
  }

  getAnalysisWithFiles(id: number): AnalysisWithFiles | undefined {
    const analysis = this.getAnalysisById(id);
    if (!analysis) return undefined;

    const files = this.getAnalysisFiles(id);
    return { ...analysis, files };
  }

  getAnalysisFiles(analysisId: number): PufAnalysisFile[] {
    const stmt = this.db.prepare('SELECT * FROM puf_analysis_files WHERE analysis_id = ?');
    return stmt.all(analysisId) as PufAnalysisFile[];
  }

  getAnalysisFileById(id: number): PufAnalysisFile | undefined {
    const stmt = this.db.prepare('SELECT * FROM puf_analysis_files WHERE id = ?');
    return stmt.get(id) as PufAnalysisFile | undefined;
  }

  getDeviceAnalysisHistory(deviceId: number): PufAnalysisResult[] {
    const stmt = this.db.prepare(
      'SELECT * FROM puf_analysis_results WHERE device_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(deviceId) as PufAnalysisResult[];
  }

  getDeviceAnalysisHistoryWithFiles(deviceId: number): AnalysisWithFiles[] {
    const analyses = this.getDeviceAnalysisHistory(deviceId);
    return analyses.map(analysis => ({
      ...analysis,
      files: this.getAnalysisFiles(analysis.id)
    }));
  }

  getAllAnalyses(limit: number = 50): PufAnalysisResult[] {
    const stmt = this.db.prepare(
      'SELECT * FROM puf_analysis_results ORDER BY created_at DESC LIMIT ?'
    );
    return stmt.all(limit) as PufAnalysisResult[];
  }

  getRecentAnalyses(limit: number = 10): AnalysisWithFiles[] {
    const analyses = this.getAllAnalyses(limit);
    return analyses.map(analysis => ({
      ...analysis,
      files: this.getAnalysisFiles(analysis.id)
    }));
  }

  getAnalysisCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM puf_analysis_results');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  searchAnalyses(searchTerm: string): PufAnalysisResult[] {
    const stmt = this.db.prepare(
      'SELECT * FROM puf_analysis_results WHERE analysis_type LIKE ? OR status LIKE ? ORDER BY created_at DESC'
    );
    const term = `%${searchTerm}%`;
    return stmt.all(term, term) as PufAnalysisResult[];
  }

  deleteAnalysis(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM puf_analysis_results WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  deleteDeviceAnalyses(deviceId: number): number {
    const stmt = this.db.prepare('DELETE FROM puf_analysis_results WHERE device_id = ?');
    const result = stmt.run(deviceId);
    return result.changes;
  }
}
