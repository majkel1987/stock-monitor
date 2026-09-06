export type SaveNoteInput = { stockId: string; content: string };

export interface NoteWriter {
  create(userId: string, input: SaveNoteInput): Promise<boolean>;
  update(
    userId: string,
    noteId: string,
    input: SaveNoteInput,
  ): Promise<boolean>;
  togglePin(
    userId: string,
    noteId: string,
    stockId: string,
    isPinned: boolean,
  ): Promise<boolean>;
  archive(userId: string, noteId: string, stockId: string): Promise<boolean>;
}
