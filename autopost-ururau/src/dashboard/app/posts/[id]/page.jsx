'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit3, Copy, Trash2, Download, Share2, Send, Image as ImgIcon, Calendar, FileText } from 'lucide-react';

const TEMPLATES_KEY = 'ururau-my-templates-v1';

export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const all = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
      const found = all.find((t) => t.id === id);
      setPost(found || null);
    } catch {}
    setLoading(false);
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">Carregando…</div>;
  if (!post) return (
    <div className="text-center py-20">
      <FileText size={36} className="mx-auto text-muted-foreground mb-3" />
      <p className="text-sm font-medium">Post não encontrado</p>
      <Link href="/history" className="text-sm text-primary hover:underline mt-2 inline-block">Voltar ao histórico</Link>
    </div>
  );

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={16} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{post.name}</h1>
          <p className="text-xs text-muted-foreground">Criado em {new Date(post.createdAt).toLocaleString('pt-BR')}</p>
        </div>
        <Link href={`/editor?id=${post.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:bg-muted/30 text-sm font-medium">
          <Edit3 size={14} /> Editar
        </Link>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          <Send size={14} /> Publicar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="aspect-[9/16] bg-gray-100 max-w-md mx-auto">
              {post.thumb ? <img src={post.thumb} alt={post.name} className="w-full h-full object-contain" /> : (
                <div className="h-full flex items-center justify-center text-muted-foreground"><ImgIcon size={48} /></div>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-white border border-border rounded-xl p-4">
            <h3 className="text-sm font-bold mb-3">Ações</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 text-sm"><Download size={14} /> Baixar PNG</button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 text-sm"><Share2 size={14} /> Compartilhar</button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 text-sm"><Copy size={14} /> Duplicar</button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-50 text-sm text-destructive"><Trash2 size={14} /> Excluir</button>
            </div>
          </div>
          <div className="bg-white border border-border rounded-xl p-4">
            <h3 className="text-sm font-bold mb-3">Metadata</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono">{post.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Categoria</span><span>{post.category || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cor</span><span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: post.accent }} />{post.accent}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Criado</span><span className="flex items-center gap-1"><Calendar size={11} />{new Date(post.createdAt).toLocaleDateString('pt-BR')}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
