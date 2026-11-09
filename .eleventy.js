// Eleventy config for Gracy Nails replication
module.exports = function (eleventyConfig) {
  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  // Layout references /css, /js, /images — map src/assets/* to those root paths.
  eleventyConfig.addPassthroughCopy({ "src/assets/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/images": "images" });
  // CNAME must survive rebuilds
  eleventyConfig.addPassthroughCopy("CNAME");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "docs",
    },
    htmlTemplateEngine: "liquid",
  };
};
