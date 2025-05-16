// vite.config.mjs
import { keepAssets } from "file:///Users/cthoburn/github/data2/node_modules/.pnpm/@warp-drive+internal-config@file+config/node_modules/@warp-drive/internal-config/vite/keep-assets.js";
import { createConfig } from "file:///Users/cthoburn/github/data2/node_modules/.pnpm/@warp-drive+internal-config@file+config/node_modules/@warp-drive/internal-config/vite/config.js";
var externals = [
  "@ember/runloop",
  "@ember/test-helpers",
  "@ember/template-compilation",
  "ember-cli-test-loader/test-support/index",
  "@glimmer/manager"
];
var entryPoints = [
  "./src/index.ts",
  "./src/reporters/dom.ts",
  "./src/runners/dom.ts",
  "./src/ember.ts",
  "./src/-types.ts"
];
var vite_config_default = createConfig(
  {
    entryPoints,
    externals,
    plugins: [keepAssets({ from: "src", include: ["./styles/**/*.css"], dist: "dist" })]
  },
  import.meta.resolve
);
export {
  vite_config_default as default,
  entryPoints,
  externals
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2N0aG9idXJuL2dpdGh1Yi9kYXRhMi9wYWNrYWdlcy9kaWFnbm9zdGljXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvY3Rob2J1cm4vZ2l0aHViL2RhdGEyL3BhY2thZ2VzL2RpYWdub3N0aWMvdml0ZS5jb25maWcubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9jdGhvYnVybi9naXRodWIvZGF0YTIvcGFja2FnZXMvZGlhZ25vc3RpYy92aXRlLmNvbmZpZy5tanNcIjtpbXBvcnQgeyBrZWVwQXNzZXRzIH0gZnJvbSAnQHdhcnAtZHJpdmUvaW50ZXJuYWwtY29uZmlnL3ZpdGUva2VlcC1hc3NldHMnO1xuaW1wb3J0IHsgY3JlYXRlQ29uZmlnIH0gZnJvbSAnQHdhcnAtZHJpdmUvaW50ZXJuYWwtY29uZmlnL3ZpdGUvY29uZmlnLmpzJztcblxuZXhwb3J0IGNvbnN0IGV4dGVybmFscyA9IFtcbiAgJ0BlbWJlci9ydW5sb29wJyxcbiAgJ0BlbWJlci90ZXN0LWhlbHBlcnMnLFxuICAnQGVtYmVyL3RlbXBsYXRlLWNvbXBpbGF0aW9uJyxcbiAgJ2VtYmVyLWNsaS10ZXN0LWxvYWRlci90ZXN0LXN1cHBvcnQvaW5kZXgnLFxuICAnQGdsaW1tZXIvbWFuYWdlcicsXG5dO1xuZXhwb3J0IGNvbnN0IGVudHJ5UG9pbnRzID0gW1xuICAnLi9zcmMvaW5kZXgudHMnLFxuICAnLi9zcmMvcmVwb3J0ZXJzL2RvbS50cycsXG4gICcuL3NyYy9ydW5uZXJzL2RvbS50cycsXG4gICcuL3NyYy9lbWJlci50cycsXG4gICcuL3NyYy8tdHlwZXMudHMnLFxuXTtcblxuZXhwb3J0IGRlZmF1bHQgY3JlYXRlQ29uZmlnKFxuICB7XG4gICAgZW50cnlQb2ludHMsXG4gICAgZXh0ZXJuYWxzLFxuICAgIHBsdWdpbnM6IFtrZWVwQXNzZXRzKHsgZnJvbTogJ3NyYycsIGluY2x1ZGU6IFsnLi9zdHlsZXMvKiovKi5jc3MnXSwgZGlzdDogJ2Rpc3QnIH0pXSxcbiAgfSxcbiAgaW1wb3J0Lm1ldGEucmVzb2x2ZVxuKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1UsU0FBUyxrQkFBa0I7QUFDL1YsU0FBUyxvQkFBb0I7QUFFdEIsSUFBTSxZQUFZO0FBQUEsRUFDdkI7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0Y7QUFDTyxJQUFNLGNBQWM7QUFBQSxFQUN6QjtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFDRjtBQUVBLElBQU8sc0JBQVE7QUFBQSxFQUNiO0FBQUEsSUFDRTtBQUFBLElBQ0E7QUFBQSxJQUNBLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxPQUFPLFNBQVMsQ0FBQyxtQkFBbUIsR0FBRyxNQUFNLE9BQU8sQ0FBQyxDQUFDO0FBQUEsRUFDckY7QUFBQSxFQUNBLFlBQVk7QUFDZDsiLAogICJuYW1lcyI6IFtdCn0K
