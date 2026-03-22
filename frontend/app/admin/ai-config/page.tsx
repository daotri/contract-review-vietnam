'use client';

// AI config page — model ID, API key, temperature, test + save
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import {
  getAiConfig,
  updateAiConfig,
  testAiConfig,
  type AiConfig,
} from '@/lib/admin-api-client';

const MODEL_REFERENCE = [
  { provider: 'OpenAI', examples: 'gpt-4o, gpt-4o-mini, gpt-4-turbo' },
  { provider: 'Anthropic', examples: 'claude-3-5-sonnet-20241022, claude-3-haiku-20240307' },
  { provider: 'Google', examples: 'gemini-1.5-pro, gemini-1.5-flash' },
  { provider: 'Groq', examples: 'llama-3.1-70b-versatile, mixtral-8x7b-32768' },
];

export default function AiConfigPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [modelId, setModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.1);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getAiConfig()
      .then((cfg) => {
        setConfig(cfg);
        setModelId(cfg.llm_model);
        setApiKey(cfg.llm_api_key_masked);
        setTemperature(cfg.llm_temperature ?? 0.1);
      })
      .catch((err) =>
        toast({ title: 'Lỗi tải cấu hình', description: (err as Error).message, variant: 'destructive' })
      );
  }, [toast]);

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testAiConfig();
      const ok = result.status === 'ok';
      toast({
        title: ok ? 'Kết nối thành công' : 'Kết nối thất bại',
        description: ok
          ? `Độ trễ: ${result.latency_ms}ms — ${result.model}`
          : result.error || 'Không thể kết nối',
        variant: ok ? 'default' : 'destructive',
      });
    } catch (err) {
      toast({ title: 'Lỗi kiểm tra', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!modelId.trim() || !apiKey.trim()) {
      toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập Model ID và API Key.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await updateAiConfig({ llm_model: modelId.trim(), llm_api_key: apiKey.trim(), llm_temperature: temperature });
      toast({ title: 'Đã lưu cấu hình AI' });
    } catch (err) {
      toast({ title: 'Lỗi lưu cấu hình', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cấu hình AI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Thiết lập mô hình ngôn ngữ dùng cho phân tích hợp đồng.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mô hình LLM</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="model-id">Model ID</Label>
              <Input
                id="model-id"
                placeholder="gpt-4o-mini"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Nhập tên mô hình theo đúng tài liệu của nhà cung cấp.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label={showKey ? 'Ẩn API key' : 'Hiện API key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Nhiệt độ (Temperature)</Label>
                <span className="text-sm font-mono text-muted-foreground">{(temperature ?? 0.1).toFixed(2)}</span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[temperature ?? 0.1]}
                onValueChange={([v]) => setTemperature(v)}
                className="max-w-sm"
              />
              <p className="text-xs text-muted-foreground">0.0 = xác định, 1.0 = sáng tạo. Khuyến nghị: 0.1</p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="border-border hover:bg-white/5">
                {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
              </Button>
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:opacity-90">
                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tham khảo — Model ID theo nhà cung cấp</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 font-medium text-muted-foreground">Nhà cung cấp</th>
                <th className="text-left py-1.5 font-medium text-muted-foreground">Ví dụ Model ID</th>
              </tr>
            </thead>
            <tbody>
              {MODEL_REFERENCE.map(({ provider, examples }) => (
                <tr key={provider} className="border-b last:border-0">
                  <td className="py-2 font-medium">{provider}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {config && (
        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Embedding (chỉ đọc)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mô hình nhúng</span>
              <span className="font-mono">{config.embed_model}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số chiều vector</span>
              <span className="font-mono">{config.embed_dimension}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
