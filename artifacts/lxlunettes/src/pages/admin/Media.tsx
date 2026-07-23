import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Eye, Film, FolderOpen, Globe, Image, LayoutGrid, Link2, List, Plus, Search, Trash2, X } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUploadButton } from '@/components/FileUploadButton';
import { useToast } from '@/hooks/use-toast';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  folder: string;
  published: boolean;
  featuredType: 'sale' | 'story' | null;
  addedAt: string;
}

interface MediaForm {
  url: string;
  type: 'image' | 'video';
  name: string;
  folder: string;
  published: boolean;
  featuredType: '' | 'sale' | 'story';
}

const FOLDERS = ['general', 'produits', 'promotions', 'stories', 'ventes'];
const EMPTY_FORM: MediaForm = {
  url: '',
  type: 'image',
  name: '',
  folder: 'general',
  published: false,
  featuredType: '',
};

const inferType = (url: string): MediaForm['type'] =>
  /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(url) ? 'video' : 'image';

function MediaPreview({ item, compact = false }: { item: MediaItem; compact?: boolean }) {
  const className = compact ? 'h-12 w-12 rounded-sm object-cover bg-muted' : 'h-full w-full object-cover';
  return item.type === 'video'
    ? <video src={item.url} className={className} muted playsInline preload="metadata" />
    : <img src={item.url} alt={item.name} className={className} loading="lazy" />;
}

export default function AdminMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [addModal, setAddModal] = useState(false);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<MediaForm>(EMPTY_FORM);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-media', search, typeFilter, folderFilter],
    queryFn: async () => (await adminApi.get('/api/media', {
      params: { search: search || undefined, type: typeFilter || undefined, folder: folderFilter || undefined },
    })).data,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-media'] });
  const mutationError = (caught: Error) =>
    toast({ title: 'Erreur', description: caught.message, variant: 'destructive' });

  const add = useMutation({
    mutationFn: async (values: MediaForm) => (await adminApi.post('/api/media', {
      ...values,
      featuredType: values.featuredType || null,
    })).data,
    onSuccess: () => {
      refresh();
      setAddModal(false);
      setForm(EMPTY_FORM);
      toast({ title: 'Média ajouté dans Supabase ✓' });
    },
    onError: mutationError,
  });

  const update = useMutation({
    mutationFn: async ({ id, data: changes }: { id: string; data: Partial<MediaItem> }) =>
      (await adminApi.patch(`/api/media/${id}`, changes)).data,
    onSuccess: refresh,
    onError: mutationError,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/api/media/${id}`),
    onSuccess: () => {
      refresh();
      setDeleteId(null);
      toast({ title: 'Média supprimé' });
    },
    onError: mutationError,
  });

  const items: MediaItem[] = data?.items ?? [];
  const togglePublish = (item: MediaItem) =>
    update.mutate({ id: item.id, data: { published: !item.published } });
  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast({ title: 'URL copiée ✓' });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif tracking-widest uppercase">Médias</h1>
          <p className="mt-1 text-sm text-muted-foreground">Images, vidéos et dossiers enregistrés dans Supabase</p>
        </div>
        <Button onClick={() => setAddModal(true)} className="uppercase tracking-widest text-xs">
          <Plus className="mr-2 h-4 w-4" /> Ajouter un média
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Images', value: items.filter(item => item.type === 'image').length, icon: Image },
          { label: 'Vidéos', value: items.filter(item => item.type === 'video').length, icon: Film },
          { label: 'Publiés', value: items.filter(item => item.published).length, icon: Globe },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 border border-border bg-card p-4">
            <Icon className="h-5 w-5 text-primary" />
            <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher..." className="pl-9" />
        </div>
        <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="rounded-sm border border-border bg-card px-3 py-2 text-sm">
          <option value="">Tous les types</option><option value="image">Images</option><option value="video">Vidéos</option>
        </select>
        <select value={folderFilter} onChange={event => setFolderFilter(event.target.value)} className="rounded-sm border border-border bg-card px-3 py-2 text-sm">
          <option value="">Tous les dossiers</option>
          {FOLDERS.map(folder => <option key={folder} value={folder}>{folder}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-sm border border-border">
          <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card'}`} aria-label="Vue grille"><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card'}`} aria-label="Vue liste"><List className="h-4 w-4" /></button>
        </div>
      </div>

      {error ? (
        <div className="border border-destructive/40 bg-destructive/10 p-8 text-center text-sm text-destructive">{(error as Error).message}</div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-square animate-pulse border border-border bg-card" />)}</div>
      ) : items.length === 0 ? (
        <div className="border border-border bg-card py-20 text-center text-muted-foreground">
          <FolderOpen className="mx-auto mb-3 h-12 w-12 opacity-20" />
          <p className="font-serif text-lg">Aucun média dans ce dossier</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {items.map(item => (
            <article key={item.id} className="group relative aspect-square overflow-hidden border border-border bg-card">
              <MediaPreview item={item} />
              <div className="absolute inset-0 flex flex-col justify-between bg-black/65 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex justify-end gap-1">
                  <button onClick={() => setPreview(item)} className="rounded bg-white/10 p-1.5 text-white"><Eye className="h-3.5 w-3.5" /></button>
                  <button onClick={() => copyUrl(item.url)} className="rounded bg-white/10 p-1.5 text-white"><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteId(item.id)} className="rounded bg-red-500/20 p-1.5 text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div>
                  <p className="truncate text-xs font-medium text-white">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="rounded bg-white/10 px-2 py-1 text-[9px] uppercase text-white">{item.folder} · {item.type}</span>
                    <button onClick={() => togglePublish(item)} className={`rounded px-2 py-1 text-[9px] uppercase ${item.published ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-white'}`}>
                      {item.published ? 'Publié' : 'Publier'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mobile-scrollbar overflow-x-auto border border-border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="p-3">Aperçu</th><th className="p-3">Nom</th><th className="p-3">Dossier</th><th className="p-3">Type</th><th className="p-3">Statut</th><th className="p-3">Actions</th>
            </tr></thead>
            <tbody>{items.map(item => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="p-3"><MediaPreview item={item} compact /></td>
                <td className="max-w-[220px] truncate p-3">{item.name}</td>
                <td className="p-3 text-muted-foreground">{item.folder}</td>
                <td className="p-3 uppercase">{item.type}</td>
                <td className="p-3"><button onClick={() => togglePublish(item)} className={item.published ? 'text-emerald-400' : 'text-muted-foreground'}>{item.published ? 'Publié' : 'Brouillon'}</button></td>
                <td className="p-3"><div className="flex gap-2"><button onClick={() => setPreview(item)}><Eye className="h-4 w-4" /></button><button onClick={() => copyUrl(item.url)}><Copy className="h-4 w-4" /></button><button onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setAddModal(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-border bg-card" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-6"><h2 className="font-serif text-xl">Ajouter un média</h2><button onClick={() => setAddModal(false)}><X /></button></div>
            <div className="space-y-4 p-6">
              <div className="flex flex-col items-center gap-3 border border-dashed border-border bg-background/50 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Importer depuis votre appareil</p>
                <FileUploadButton accept="image/*,video/*" label="Choisir une image ou vidéo" onUploaded={(url, type, name) => setForm(current => ({ ...current, url, type: type as MediaForm['type'], name: name || '' }))} />
              </div>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-border" /><Link2 className="h-3 w-3" /> ou par URL<span className="h-px flex-1 bg-border" /></div>
              <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">URL *</label><Input value={form.url} onChange={event => setForm(current => ({ ...current, url: event.target.value, type: inferType(event.target.value) }))} placeholder="https://..." /></div>
              {form.url && <div className="h-36 overflow-hidden border border-border bg-black">{form.type === 'video' ? <video src={form.url} controls className="h-full w-full object-contain" /> : <img src={form.url} alt="Aperçu" className="h-full w-full object-contain" />}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Nom</label><Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="hero-promotion" /></div>
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Type</label><select value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as MediaForm['type'] }))} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"><option value="image">Image</option><option value="video">Vidéo</option></select></div>
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Dossier</label><select value={form.folder} onChange={event => setForm(current => ({ ...current, folder: event.target.value }))} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm">{FOLDERS.map(folder => <option key={folder} value={folder}>{folder}</option>)}</select></div>
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Mise en avant</label><select value={form.featuredType} onChange={event => setForm(current => ({ ...current, featuredType: event.target.value as MediaForm['featuredType'] }))} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"><option value="">Aucune</option><option value="sale">Sale</option><option value="story">Story</option></select></div>
              </div>
              <label className="flex items-center gap-3 border border-border bg-background p-3 text-sm"><input type="checkbox" checked={form.published} onChange={event => setForm(current => ({ ...current, published: event.target.checked }))} /> Publier immédiatement</label>
            </div>
            <div className="flex justify-end gap-3 border-t border-border p-6"><Button variant="ghost" onClick={() => setAddModal(false)}>Annuler</Button><Button onClick={() => add.mutate(form)} disabled={!form.url || add.isPending}>{add.isPending ? 'Ajout...' : 'Ajouter'}</Button></div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPreview(null)}>
          <div className="relative w-full max-w-4xl" onClick={event => event.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="absolute -top-10 right-0 text-white"><X /></button>
            {preview.type === 'video' ? <video src={preview.url} controls autoPlay className="max-h-[80vh] w-full" /> : <img src={preview.url} alt={preview.name} className="max-h-[80vh] w-full object-contain" />}
            <div className="mt-3 flex items-center justify-between text-white"><div><p>{preview.name}</p><p className="text-xs text-white/60">{preview.folder} · {preview.type}</p></div><button onClick={() => togglePublish(preview)} className="flex items-center gap-2 rounded bg-white/10 px-3 py-2 text-xs uppercase">{preview.published ? <Check className="h-3 w-3" /> : <Globe className="h-3 w-3" />}{preview.published ? 'Dépublier' : 'Publier'}</button></div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm border border-border bg-card p-6 text-center"><Trash2 className="mx-auto mb-4 h-8 w-8 text-destructive" /><h3>Supprimer ce média ?</h3><div className="mt-6 flex justify-center gap-3"><Button variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Button><Button variant="destructive" onClick={() => remove.mutate(deleteId)} disabled={remove.isPending}>Supprimer</Button></div></div>
        </div>
      )}
    </div>
  );
}
