
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull(),
  avatar: text("avatar").default("default"), // Color code or avatar ID
  totalScore: integer("total_score").default(0),
  gamesPlayed: integer("games_played").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  hostId: uuid("host_id").references(() => users.id),
  status: text("status").notNull().default("waiting"), // waiting, playing, finished
  maxPlayers: integer("max_players").default(8),
  roundCount: integer("round_count").default(3),
  roundTime: integer("round_time").default(60), // seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").references(() => rooms.id).notNull(),
  currentRound: integer("current_round").default(1),
  currentDrawerId: uuid("current_drawer_id").references(() => users.id),
  currentWord: text("current_word"),
  state: text("state").default("lobby"), // lobby, selecting_word, drawing, round_end, game_end
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  hostedRooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  host: one(users, {
    fields: [rooms.hostId],
    references: [users.id],
  }),
  games: many(games),
}));

export const gamesRelations = relations(games, ({ one }) => ({
  room: one(rooms, {
    fields: [games.roomId],
    references: [rooms.id],
  }),
  currentDrawer: one(users, {
    fields: [games.currentDrawerId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastSeen: true, totalScore: true, gamesPlayed: true });
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true, createdAt: true, status: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Game = typeof games.$inferSelect;

export type CreateUserRequest = z.infer<typeof insertUserSchema>;
export type CreateRoomRequest = z.infer<typeof insertRoomSchema>;

// Socket Event Payloads
export interface DrawEvent {
  type: "start" | "drag" | "end" | "clear" | "fill";
  roomId: string;

  x?: number;
  y?: number;
  color?: string;
  size?: number;
}


export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  type: "chat" | "guess" | "system";
  isCorrect?: boolean;
  timestamp: number;
}

export interface GameState {
  roomId: string;
  status: string;
  state: string;
  round: number;
  maxRounds: number;
  drawerId: string | null;
  word: string | null;
  wordHint: string; // " _ _ L _ "
  wordOptions: string[];
  timer: number;
  players: {
    id: string;
    username: string;
    score: number;
    avatar: string;
    isDrawer: boolean;
    hasGuessed: boolean;
    connected: boolean;
  }[];
}
