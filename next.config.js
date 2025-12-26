/** @type {import('next').NextConfig} */
const nextConfig = {
  // APIルートのタイムアウトを延長（開発環境と本番環境の両方）
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  output: 'export',
  distDir: 'out',
  assetPrefix: '',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // 型チェックをスキップ（ビルド時間短縮のため）
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // クエリパラメータ方式のルーティングを使用するため、動的ルーティングは無効化
  // すべてのページは静的エクスポート可能
  webpack: (config, { isServer, webpack }) => {
    // canvasモジュールを外部化（クライアントサイドビルドでエラーを回避）
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      path: false,
      crypto: false,
    };
    
    // ソースマップの警告を抑制（開発環境でのloader.js.mapエラーを回避）
    if (!isServer) {
      config.devtool = false; // ソースマップを無効化（開発環境でも）
    }
    
    // ビルドパフォーマンス最適化
    if (!isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^canvas$/,
          contextRegExp: /node_modules\/vega-canvas/,
        })
      );
      
      // vega-canvas.node.jsを無視する設定
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /vega-canvas\\.node\\.js$/,
        })
      );
      
      // ソースマップファイルの404エラーを抑制
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /\.map$/,
          contextRegExp: /node_modules\/next\/dist/,
        })
      );
    }
    
    // キャッシュ設定でビルド時間を短縮
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };
    
    return config;
  },
}

module.exports = nextConfig

