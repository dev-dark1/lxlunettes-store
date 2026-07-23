import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/adminAuth.js";

export const mediaRouter = Router();

const MEDIA_KEY = "MEDIA_ITEMS";

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  name: string;
  folder: string;
  published: boolean;
  featuredType: "sale" | "story" | null;
  addedAt: string;
}

async function getMediaItems(): Promise<MediaItem[]> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, MEDIA_KEY));
  if (!rows.length) return [];
  try {
    const parsed = JSON.parse(rows[0].value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeMediaItem).filter((item): item is MediaItem => Boolean(item));
  } catch {
    return [];
  }
}

async function saveMediaItems(items: MediaItem[]) {
  await db
    .insert(settingsTable)
    .values({ key: MEDIA_KEY, value: JSON.stringify(items) })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: JSON.stringify(items) } });
}

// GET /api/media — all items (admin)
mediaRouter.get("/media", requireAdmin, async (req, res) => {
  try {
    const items = await getMediaItems();
    const { folder, type, search } = req.query as Record<string, string>;
    let filtered = items;
    if (folder) filtered = filtered.filter(i => i.folder === folder);
    if (type) filtered = filtered.filter(i => i.type === type);
    if (search) filtered = filtered.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    res.json({ items: filtered, total: filtered.length });
  } catch { res.status(500).json({ error: "Failed to fetch media" }); }
});

// GET /api/media/published — public, returns published items for homepage
mediaRouter.get("/media/published", async (_req, res) => {
  try {
    const items = await getMediaItems();
    res.json(items.filter(i => i.published));
  } catch { res.status(500).json({ error: "Failed to fetch media" }); }
});

// POST /api/media — add media item (admin)
mediaRouter.post("/media", requireAdmin, async (req, res): Promise<void> => {
  try {
    const { url, type, name, folder = "general", published = false, featuredType = null } = req.body;
    if (!url || !["image", "video"].includes(type)) {
      res.status(400).json({ error: "Une URL et un type image/vidéo valides sont obligatoires." });
      return;
    }
    try {
      new URL(url);
    } catch {
      res.status(400).json({ error: "L’URL du média est invalide." });
      return;
    }
    const items = await getMediaItems();
    const newItem: MediaItem = {
      id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url: String(url),
      type,
      name: String(name || url.split("/").pop() || "media"),
      folder: String(folder || "general"),
      published: Boolean(published),
      featuredType: featuredType === "sale" || featuredType === "story" ? featuredType : null,
      addedAt: new Date().toISOString(),
    };
    items.unshift(newItem);
    await saveMediaItems(items);
    res.json(newItem);
  } catch (error) {
    console.error("Failed to add media", error);
    res.status(500).json({ error: "Impossible d’ajouter le média dans Supabase." });
  }
});

// PATCH /api/media/:id — update item
mediaRouter.patch("/media/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const items = await getMediaItems();
    const idx = items.findIndex(i => i.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const changes = req.body as Partial<MediaItem>;
    items[idx] = {
      ...items[idx],
      ...(changes.name !== undefined ? { name: String(changes.name).trim() || items[idx].name } : {}),
      ...(changes.folder !== undefined ? { folder: String(changes.folder) || "general" } : {}),
      ...(changes.published !== undefined ? { published: Boolean(changes.published) } : {}),
      ...(changes.featuredType !== undefined ? { featuredType: changes.featuredType === "sale" || changes.featuredType === "story" ? changes.featuredType : null } : {}),
      id: items[idx].id,
    };
    await saveMediaItems(items);
    res.json(items[idx]);
  } catch (error) {
    console.error("Failed to update media", error);
    res.status(500).json({ error: "Impossible de modifier le média." });
  }
});

// DELETE /api/media/:id
mediaRouter.delete("/media/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const items = await getMediaItems();
    const filtered = items.filter(i => i.id !== req.params.id);
    if (filtered.length === items.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await saveMediaItems(filtered);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete media", error);
    res.status(500).json({ error: "Impossible de supprimer le média." });
  }
});

function normalizeMediaItem(value: Record<string, unknown>): MediaItem | null {
  if (!value || !value.url) return null;
  const type = value.type === "video" ? "video" : "image";
  return {
    id: String(value.id || `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    url: String(value.url),
    type,
    name: String(value.name || value.title || String(value.url).split("/").pop() || "media"),
    folder: String(value.folder || "general"),
    published: value.published !== undefined ? Boolean(value.published) : value.status === "active" || value.status === "published",
    featuredType: value.featuredType === "sale" || value.featuredType === "story" ? value.featuredType : null,
    addedAt: String(value.addedAt || value.created_at || value.createdAt || new Date().toISOString()),
  };
}
