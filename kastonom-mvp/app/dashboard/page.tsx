'use client';
import { mockProducts } from '../../lib/mockData';
import { Card, Badge, Button } from '../../components/ui-components';
import { UploadCloud, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Automation</h1>
          <p className="text-slate-400 mt-1">Select an AI-recommended product to generate a campaign.</p>
        </div>
        <Badge variant="demo">Demo Mock API Enabled</Badge>
      </div>

      <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center bg-slate-800/30 hover:bg-slate-800/50 transition cursor-pointer">
        <UploadCloud className="mx-auto h-10 w-10 text-slate-400 mb-4" />
        <h3 className="text-sm font-semibold text-white">Upload New Product Data (CSV/ERP Sync)</h3>
        <p className="text-xs text-slate-500 mt-1">Or select an existing product from your synced catalog below.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockProducts.map((product: any) => (
          <Card key={product.id} className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">{product.name}</h2>
                {product.is_recommended && <Badge variant="success" className="animate-pulse flex items-center gap-1"><Zap className="w-3 h-3"/> Recommended</Badge>}
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                  <span className="text-sm text-slate-400">AI Hype Score</span>
                  <span className="text-lg font-bold text-teal-400">{product.hype_score}/100</span>
                </div>
                <div className="flex justify-between items-center text-sm p-2">
                  <span className="text-slate-400">Trend Potential</span>
                  <span className="font-medium text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500"/>{product.trend_potential}</span>
                </div>
                <div className="flex justify-between items-center text-sm p-2">
                  <span className="text-slate-400">Sales Velocity</span>
                  <span className="font-medium text-white">{product.sales_velocity}</span>
                </div>
              </div>
            </div>
            <Button className="w-full group" onClick={() => router.push(`/product/${product.id}`)}>
              Review Insights & Generate Ad <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}