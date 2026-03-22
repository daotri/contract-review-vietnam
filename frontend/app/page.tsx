// Landing page — dark SaaS hero with features, architecture, guide, CTA
import Link from 'next/link';
import { FileSearch, Shield, Scale, Zap, Database, Bot, Upload, Search, FileCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-sm">Contract AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Tính năng</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">Kiến trúc</a>
            <a href="#guide" className="hover:text-foreground transition-colors">Hướng dẫn</a>
          </div>
          <Link
            href="/review"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:opacity-90 transition-opacity"
          >
            Bắt đầu
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-purple-900/20 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Hỗ trợ 9 bộ luật Việt Nam
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            <span className="text-gradient">Kiểm Tra Hợp Đồng</span>
            <br />
            <span className="text-foreground">Bằng AI</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Phân tích rủi ro pháp lý, kiểm tra tuân thủ luật Việt Nam và đề xuất chỉnh sửa — chỉ trong vài giây.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/review"
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold text-base hover:shadow-glow-purple transition-shadow"
            >
              Tải lên hợp đồng
            </Link>
            <a
              href="#guide"
              className="px-8 py-3 rounded-lg border border-white/10 text-foreground font-medium text-base hover:bg-white/5 transition-colors"
            >
              Xem hướng dẫn
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Tính năng nổi bật</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">Tất cả những gì bạn cần để kiểm tra hợp đồng một cách toàn diện</p>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard icon={Shield} title="Phát hiện rủi ro" desc="Phân loại từng điều khoản theo 4 mức: nghiêm trọng, cao, trung bình, thấp. Đánh giá tổng quan bằng hệ thống đèn giao thông." />
            <FeatureCard icon={Scale} title="Đối chiếu pháp luật" desc="So sánh với Bộ luật Dân sự, Luật Thương mại, Luật Lao động, Luật Xây dựng và các nghị định hướng dẫn." />
            <FeatureCard icon={Zap} title="Đề xuất chỉnh sửa" desc="AI đề xuất văn bản thay thế cho điều khoản có rủi ro, kèm căn cứ pháp lý cụ thể." />
            <FeatureCard icon={Database} title="Kho luật cập nhật" desc="5,300+ điều khoản luật Việt Nam được vector hóa, tìm kiếm ngữ nghĩa nhanh chóng." />
            <FeatureCard icon={Bot} title="Chat trợ lý" desc="Hỏi đáp trực tiếp về hợp đồng sau khi phân tích. AI trả lời dựa trên ngữ cảnh và căn cứ luật." />
            <FeatureCard icon={FileCheck} title="Xuất báo cáo" desc="Tải báo cáo kiểm tra dạng HTML chuyên nghiệp, có thể in ra PDF để trình ký." />
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Kiến trúc hệ thống</h2>
          <p className="text-center text-muted-foreground mb-12">Xây dựng trên nền tảng hiện đại, mã nguồn mở</p>
          <div className="glass-card p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <ArchBlock title="Frontend" items={['Next.js 14 (React 18)', 'Tailwind CSS + shadcn/ui', 'TypeScript']} />
              <ArchBlock title="Backend" items={['FastAPI (Python)', 'LiteLLM (multi-provider)', 'OpenAI Embeddings']} />
              <ArchBlock title="Database" items={['PostgreSQL + pgvector', 'Vector similarity search (HNSW)', '5,300+ law chunks indexed']} />
              <ArchBlock title="AI Pipeline" items={['Crawl → Parse → Chunk → Embed', 'RAG (Retrieval-Augmented Generation)', 'Configurable LLM (GPT-4o, Claude, ...)']} />
            </div>
          </div>
        </div>
      </section>

      {/* Guide */}
      <section id="guide" className="py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Hướng dẫn sử dụng</h2>
          <p className="text-center text-muted-foreground mb-12">3 bước đơn giản để kiểm tra hợp đồng</p>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard step={1} icon={Upload} title="Tải lên hợp đồng" desc="Kéo thả file PDF hoặc DOCX vào khu vực upload. Tối đa 10MB." />
            <StepCard step={2} icon={Search} title="AI phân tích" desc="Hệ thống tự động tách điều khoản, đối chiếu với 9 bộ luật và đánh giá rủi ro." />
            <StepCard step={3} icon={FileCheck} title="Xem kết quả" desc="Xem báo cáo chi tiết, chat hỏi đáp với AI, và xuất báo cáo PDF." />
          </div>
          <div className="text-center mt-12">
            <Link
              href="/review"
              className="inline-flex px-8 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold hover:shadow-glow-purple transition-shadow"
            >
              Bắt đầu kiểm tra ngay
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-purple-400" />
            <span>Contract AI</span>
          </div>
          <p>Công cụ hỗ trợ — không thay thế tư vấn pháp lý chuyên nghiệp.</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="glass-card glow-hover p-6 space-y-3">
      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-purple-400" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function ArchBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-purple-400 text-sm uppercase tracking-wider">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500/50 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepCard({ step, icon: Icon, title, desc }: { step: number; icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="text-center space-y-4">
      <div className="relative mx-auto w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
        <Icon className="w-7 h-7 text-purple-400" />
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
          {step}
        </span>
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
