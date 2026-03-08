import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@kova/shared'],
  // @tiptap/extension-collaboration uses @tiptap/y-tiptap (fork of y-prosemirror)
  // @tiptap/extension-collaboration-cursor uses y-prosemirror directly
  // They create separate ySyncPluginKey instances causing cursor plugin crash.
  // Alias y-prosemirror → @tiptap/y-tiptap so they share the same plugin keys.
  turbopack: {
    resolveAlias: {
      'y-prosemirror': '@tiptap/y-tiptap',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'y-prosemirror': '@tiptap/y-tiptap',
    };
    return config;
  },
};

export default nextConfig;
