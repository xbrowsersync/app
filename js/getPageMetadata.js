(function () {
  var getPageMetadata = function () {
    var txt = document.createElement('textarea');

    var getPageDescription = function () {
      var ogDescription = document.querySelector('meta[property="OG:DESCRIPTION"]') || document.querySelector('meta[property="og:description"]');
      if (ogDescription && ogDescription.content) {
        txt.innerHTML = ogDescription.content.trim();
        return txt.value;
      }

      var twitterDescription = document.querySelector('meta[name="TWITTER:DESCRIPTION"]') || document.querySelector('meta[name="twitter:description"]');
      if (twitterDescription && twitterDescription.content) {
        txt.innerHTML = twitterDescription.content.trim();
        return txt.value;
      }

      var defaultDescription = document.querySelector('meta[name="DESCRIPTION"]') || document.querySelector('meta[name="description"]');
      if (defaultDescription && defaultDescription.content) {
        txt.innerHTML = defaultDescription.content.trim();
        return txt.value;
      }

      return '';
    };

    var getPageKeywords = function () {
      var keywords = [];

      // Get open graph tag values 
      document.querySelectorAll('meta[property="OG:VIDEO:TAG"]').forEach(function (tag) {
        if (tag && tag.content) {
          keywords.push(tag.content.trim());
        }
      });
      document.querySelectorAll('meta[property="og:video:tag"]').forEach(function (tag) {
        if (tag && tag.content) {
          keywords.push(tag.content.trim());
        }
      });

      // Get meta tag values 
      var metaKeywords = document.querySelector('meta[name="KEYWORDS"]') || document.querySelector('meta[name="keywords"]');
      if (metaKeywords && metaKeywords.content) {
        metaKeywords.content.split(',').forEach(function (keyword) {
          if (keyword) {
            keywords.push(keyword.trim());
          }
        });
      }

      // Remove duplicates
      var uniqueKeywords = keywords.filter(function (value, index, self) {
        return self.indexOf(value) === index;
      });

      if (uniqueKeywords.length > 0) {
        return uniqueKeywords.join();
      }

      return null;
    };

    var getPageTitle = function () {
      var ogTitle = document.querySelector('meta[property="OG:TITLE"]') || document.querySelector('meta[property="og:title"]');
      if (ogTitle && ogTitle.content) {
        txt.innerHTML = ogTitle.content.trim();
        return txt.value;
      }

      var twitterTitle = document.querySelector('meta[name="TWITTER:TITLE"]') || document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle && twitterTitle.content) {
        txt.innerHTML = twitterTitle.content.trim();
        return txt.value;
      }

      return document.title;
    };

    return {
      title: getPageTitle(),
      url: document.location.href,
      description: getPageDescription(),
      tags: getPageKeywords()
    };
  };

  return getPageMetadata();
})();