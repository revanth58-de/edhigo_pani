const upstreamTransformer = require('@expo/metro-config/build/babel-transformer');

module.exports.transform = function(args) {
  let { src, filename, options } = args;
  if (src && src.includes('import.meta')) {
    // Replace import.meta.resolve("...") with require.resolve("...")
    src = src.replace(/import\.meta\.resolve\((['"][^'"]+['"])\)/g, 'require.resolve($1)');
    // Replace import.meta.url with a safe empty string
    src = src.replace(/import\.meta\.url/g, '""');
    // Replace any remaining import.meta references with a safe empty object
    src = src.replace(/import\.meta/g, '{}');
    args.src = src;
  }
  return upstreamTransformer.transform(args);
};
