import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Heart, MessageCircle, ExternalLink, Send, Trash2 } from 'lucide-react';
import api, { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import ImageLightbox from '../components/ImageLightbox';
import StatusBadge from '../components/StatusBadge';
import { PageLoader, Spinner } from '../components/Spinner';
import { Field, Textarea, SubmitButton } from '../components/Form';
import { timeAgo, formatDateTime, truncate } from '../utils/format';

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
      className="h-full w-full object-contain"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function PostDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [likesBusy, setLikesBusy] = useState(false);
  const [likes, setLikes] = useState([]);
  const [likesError, setLikesError] = useState('');
  const [previewImage, setPreviewImage] = useState('');

  const load = () => {
    api.get(`/community/${id}`)
      .then((r) => setPost(r.data.data.post))
      .catch((e) => setError(apiError(e)));
    api.get(`/community/${id}/comments`)
      .then((r) => setComments(r.data.data.items))
      .catch(() => {});
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const like = async () => {
    setPost((p) => ({ ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }));
    try {
      if (post.likedByMe) await api.delete(`/community/${id}/like`);
      else await api.post(`/community/${id}/like`);
    } catch (e) {
      toast.error(apiError(e));
      load();
    }
  };

  const openLikes = async () => {
    setLikesOpen(true);
    setLikesBusy(true);
    setLikesError('');
    try {
      const { data } = await api.get(`/community/${id}/likes`);
      setLikes(data.data.items || []);
    } catch (e) {
      setLikes([]);
      setLikesError(apiError(e));
    } finally {
      setLikesBusy(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/community/${id}/comments`, { body: body.trim() });
      setComments((c) => [...c, data.data.comment]);
      setPost((p) => ({ ...p, commentCount: p.commentCount + 1 }));
      setBody('');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteComment = async (cid) => {
    try {
      await api.delete(`/community/comments/${cid}`);
      setComments((c) => c.filter((x) => x.id !== cid));
      setPost((p) => ({ ...p, commentCount: Math.max(0, p.commentCount - 1) }));
      toast.success('Comment deleted');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!post) return <PageLoader label="Loading post…" />;

  const canDeleteComment = (c) =>
    isAdmin || String(c.author?.id || c.author?._id) === String(user?.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fadeUp">
      <Link to="/community" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" /> Community feed
      </Link>

      <article className="card p-6">
        <div className="flex items-start gap-3">
          <Avatar user={post.author} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2">
              <Link to={`/members/${post.author?.username}`} className="text-sm font-semibold text-slate-900 hover:text-primary-600">
                {post.author?.name}
              </Link>
              <span className="text-xs text-slate-400">@{post.author?.username} · {formatDateTime(post.createdAt)}</span>
              {post.kind === 'submission' && (
                <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Challenge achievement</span>
              )}
              {post.status === 'removed' && <StatusBadge status="rejected">removed</StatusBadge>}
            </div>
            <h1 className="mt-3 text-xl font-bold text-slate-900">{post.title}</h1>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{post.body}</p>

            {post.challenge && (
              <Link to={`/challenges/${post.challenge.id || post.challenge._id}`} className="mt-3 inline-block rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100">
                ↳ {post.challenge.title}
              </Link>
            )}

            {post.links?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-primary-300 hover:text-primary-600">
                    <ExternalLink className="h-4 w-4" /> {l.label}
                  </a>
                ))}
              </div>
            )}

            {post.images?.length > 0 && (
              <div className="mt-4 grid grid-cols-2 justify-items-center gap-3">
                {post.images.map((img) => (
                <button key={img} type="button" onClick={() => setPreviewImage(img)} className="aspect-[9/16] w-full max-w-40 overflow-hidden rounded-xl border border-slate-100">
                    <PostImage src={img} />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center gap-5 border-t border-slate-100 pt-4">
              <button type="button" onClick={like} className={`inline-flex items-center gap-1.5 text-sm font-medium ${post.likedByMe ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}>
                <Heart className={`h-4 w-4 ${post.likedByMe ? 'fill-rose-500' : ''}`} /> Like
              </button>
              <button type="button" onClick={openLikes} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
                {post.likeCount} like{post.likeCount === 1 ? '' : 's'}
              </button>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <MessageCircle className="h-4 w-4" /> {comments.length}
              </span>
            </div>
          </div>
        </div>
      </article>

      {/* Comments */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-slate-900">Comments</h2>

        <form onSubmit={submitComment} className="mt-4 flex gap-3">
          <Avatar user={user} size="sm" />
          <div className="flex-1">
            <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a supportive comment…" maxLength={1000} />
            <div className="mt-2 flex justify-end">
              <SubmitButton busy={busy} className="btn-primary !py-2" disabled={!body.trim()}>
                <Send className="h-4 w-4" /> Comment
              </SubmitButton>
            </div>
          </div>
        </form>

        <ul className="mt-5 space-y-4">
          {comments.length === 0 && <li className="text-sm text-slate-400">No comments yet — start the conversation.</li>}
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar user={c.author} size="sm" />
              <div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{c.author?.name}</span>
                  <span className="text-xs text-slate-400">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{c.body}</p>
              </div>
              {canDeleteComment(c) && (
                <button type="button" onClick={() => deleteComment(c.id)} className="self-center rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title={isAdmin && String(c.author?.id || c.author?._id) !== String(user?.id) ? 'Remove as moderator' : 'Delete comment'}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Modal open={likesOpen} onClose={() => setLikesOpen(false)} title="Liked by" size="sm">
        {likesBusy ? (
          <PageLoader label="Loading likes…" />
        ) : likesError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{likesError}</div>
        ) : likes.length === 0 ? (
          <p className="text-sm text-slate-500">No likes yet.</p>
        ) : (
          <ul className="space-y-3">
            {likes.map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <Avatar user={u} size="sm" />
                <div className="min-w-0">
                  <Link to={`/members/${u.username}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-primary-600">
                    {u.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">@{u.username}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <ImageLightbox src={previewImage} onClose={() => setPreviewImage('')} />
    </div>
  );
}
