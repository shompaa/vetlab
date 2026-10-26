const base = process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/vet-app' : '');

export default {
  output: 'export',
  basePath: base,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { BASE: base },
  poweredByHeader: false,
};
