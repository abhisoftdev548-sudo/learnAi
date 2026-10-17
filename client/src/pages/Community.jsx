import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MessagesSquare, Heart, MessageCircle, Plus, ExternalLink, Flag, ImagePlus, X, Trash2,
} from 'lucide-react';
import api, { apiError, uploadImages } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import ImageLightbox from '../components/ImageLightbox';
import StatusBadge from '../components/StatusBadge';
import { PageLoader, Spinner } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { Field, Input, Textarea, SubmitButton } from '../components/Form';
import { timeAgo, truncate } from '../utils/format';

function PostImage({ src }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 px-2 text-center text-xs text-slate-400">
        Image cannot be loaded
      </div>
    );
  }

  return (
    <img
      src={String(src)}
      alt=""
      className="h-full w-full object-contain transition hover:scale-[1.02]"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function PostCard({ post, onLike, onReport, onDelete }) {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const removePost = async () => {
    if (!window.confirm('Delete this post for everyone?')) return;
    setDeleting(true);
    try {
      await api.delete(`/community/${post.id}`);
      toast.success('Post deleted');
      onDelete(post.id);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="card p-5">
      <div className="flex items-start gap-3">
        <Avatar user={post.author} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <Link to={`/members/${post.author?.username}`} className="text-sm font-semibold text-slate-900 hover:text-primary-600">
              {post.author?.name || 'Unknown member'}
            </Link>
            <span className="text-xs text-slate-400">@{post.author?.username} · {timeAgo(post.createdAt)}</span>
            {post.kind === 'submission' && (
              <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Challenge achievement</span>
            )}
            {post.status === 'removed' && <StatusBadge status="rejected">removed</StatusBadge>}
          </div>

          <Link to={`/community/${post.id}`} className="mt-2 block group">
            <h2 className="text-base font-semibold text-slate-900 group-hover:text-primary-700">{post.title}</h2>
          </Link>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{truncate(post.body, 400)}</p>

          {post.challenge && (
            <Link to={`/challenges/${post.challenge.id || post.challenge._id}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline">
              ↳ {post.challenge.title}
            </Link>
          )}

          {post.links?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary-300 hover:text-primary-600">
                  <ExternalLink className="h-3.5 w-3.5" /> {l.label}
                </a>
              ))}
            </div>
          )}

          {post.images?.length > 0 && (
            <div className="mt-3 grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3">
              {post.images.map((img) => (
                <button key={img} type="button" onClick={() => setPreviewImage(img)} className="aspect-[9/16] w-full max-w-40 overflow-hidden rounded-xl border border-slate-100">
                  <PostImage src={img} />
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onLike(post)}
              className={`inline-flex items-center gap-1.5 text-sm font-medium transition ${post.likedByMe ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}
            >
              <Heart className={`h-4 w-4 ${post.likedByMe ? 'fill-rose-500' : ''}`} /> {post.likeCount}
            </button>
            <Link to={`/community/${post.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
              <MessageCircle className="h-4 w-4" /> {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
            </Link>
            <button
              type="button"
              onClick={() => onReport(post)}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-amber-600"
              title="Report this post"
            >
              <Flag className="h-3.5 w-3.5" /> Report
            </button>
            {(post.author?.id === user?.id || user?.role === 'admin') && (
              <button
                type="button"
                onClick={removePost}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-rose-600"
                title="Delete this post for everyone"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
      <ImageLightbox src={previewImage} onClose={() => setPreviewImage('')} />
    </article>
  );
}

export default function Community() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [busyReport, setBusyReport] = useState(false);

  const [form, setForm] = useState({ title: '', body: '', links: [], images: [] });
  const [imageFiles, setImageFiles] = useState([]);
  const [busyCreate, setBusyCreate] = useState(false);

  const load = () => {
    const params = new URLSearchParams({ page: String(page), limit: '8' });
    if (q) params.set('q', q);
    api.get(`/community?${params}`)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(apiError(e)));
  };

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [q]);

  const onLike = async (post) => {
    // optimistic toggle
    setData((d) => ({
      ...d,
      items: d.items.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p
      ),
    }));
    try {
      if (post.likedByMe) await api.delete(`/community/${post.id}/like`);
      else await api.post(`/community/${post.id}/like`);
    } catch (e) {
      toast.error(apiError(e));
      load();
    }
  };

  const submitReport = async () => {
    if (reportReason.trim().length < 3) {
      toast.error('Please give a short reason');
      return;
    }
    setBusyReport(true);
    try {
      await api.post(`/community/${reportTarget.id}/report`, { reason: reportReason.trim() });
      toast.success('Report submitted — admins will review it');
      setReportTarget(null);
      setReportReason('');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusyReport(false);
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 3 || !form.body.trim()) {
      toast.error('Add a title and some content');
      return;
    }
    setBusyCreate(true);
    try {
      await api.post('/community', {
        title: form.title.trim(),
        body: form.body,
        links: form.links.filter((l) => l.url),
        images: form.images,
      });
      toast.success('Posted to the community 🎉');
      setCreateOpen(false);
      setForm({ title: '', body: '', links: [], images: [] });
      setImageFiles([]);
      setPage(1);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyCreate(false);
    }
  };

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading community feed…" />;

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Community</h1>
          <p className="mt-1 text-sm text-slate-500">Share your work, celebrate wins and support your teammates.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New post
        </button>
      </div>

      <div className="max-w-md">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the feed…" />
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="The feed is quiet"
          body="Be the first to share something with the team."
          action={<button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create the first post</button>}
        />
      ) : (
        <>
          <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-5">
            {data.items.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onLike={onLike}
                onReport={setReportTarget}
                onDelete={(id) => setData((current) => ({
                  ...current,
                  items: current.items.filter((item) => item.id !== id),
                  total: Math.max(0, current.total - 1),
                }))}
              />
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}

      {/* Create post modal */}
      <Modal
        open={createOpen}
        onClose={() => !busyCreate && setCreateOpen(false)}
        title="Share with the team"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)} disabled={busyCreate}>Cancel</button>
            <SubmitButton busy={busyCreate} onClick={createPost} className="btn-primary">Publish post</SubmitButton>
          </>
        }
      >
        <form onSubmit={createPost} className="space-y-4">
          <Field label="Title" required>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What did you build / learn?" maxLength={160} />
          </Field>
          <Field label="Details" required>
            <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Tell the team about it…" maxLength={4000} />
          </Field>
          <div className="space-y-2">
            <p className="label !mb-1">Links (optional)</p>
            {form.links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Label (e.g. GitHub)"
                  value={l.label}
                  onChange={(e) => {
                    const links = [...form.links];
                    links[i] = { ...l, label: e.target.value };
                    setForm({ ...form, links });
                  }}
                  className="!w-1/3"
                />
                <Input
                  placeholder="https://…"
                  value={l.url}
                  onChange={(e) => {
                    const links = [...form.links];
                    links[i] = { ...l, url: e.target.value };
                    setForm({ ...form, links });
                  }}
                />
                <button type="button" className="btn-ghost !px-2" onClick={() => setForm({ ...form, links: form.links.filter((_, j) => j !== i) })} aria-label="Remove link">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {form.links.length < 6 && (
              <button
                type="button"
                className="btn-secondary !py-2"
                onClick={() => setForm({ ...form, links: [...form.links, { label: '', url: '' }] })}
              >
                <ImagePlus className="h-4 w-4" /> Add link
              </button>
            )}
          </div>
          <div className="space-y-2">
            <p className="label !mb-1">Images (optional, up to 6)</p>
            <input type="file" accept="image/*" multiple onChange={async (e) => {
              const files = Array.from(e.target.files || []).slice(0, 6);
              if (files.some((file) => file.size > 2 * 1024 * 1024)) {
                toast.error('Each image must be 2MB or smaller');
                return;
              }
              try {
                const urls = await uploadImages(files);
                setImageFiles(files);
                setForm((current) => ({ ...current, images: urls }));
              } catch (err) { toast.error(apiError(err)); }
            }} />
            {imageFiles.length > 0 && <p className="text-xs text-slate-400">{imageFiles.length} image(s) selected</p>}
          </div>
          <p className="text-xs text-slate-400">Posting as {user?.name} · be kind and keep it work-safe.</p>
        </form>
      </Modal>

      {/* Report modal */}
      <Modal
        open={!!reportTarget}
        onClose={() => !busyReport && setReportTarget(null)}
        title="Report content"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setReportTarget(null)} disabled={busyReport}>Cancel</button>
            <button type="button" className="btn-danger" onClick={submitReport} disabled={busyReport}>
              {busyReport && <Spinner className="h-4 w-4" />} Submit report
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Reporting: <span className="font-semibold">“{reportTarget?.title}”</span>
        </p>
        <Field label="Why are you reporting this?" required>
          <Textarea rows={3} value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Spam, off-topic, inappropriate…" maxLength={500} />
        </Field>
      </Modal>
    </div>
  );
}
