/**
 * トピックファイルの型定義
 */
export interface TopicFile {
  id: string;
  topicId: string;
  parentTopicId?: string;
  filePath: string;
  fileName: string;
  mimeType?: string;
  description?: string;
  detailedDescription?: string;
  fileSize?: number;
  organizationId?: string;
  companyId?: string;
  meetingNoteId: string;
  createdAt: string;
  updatedAt: string;
}

