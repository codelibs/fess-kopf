kopf.directive('ngNavbarSection', ['$location', 'OpenSearchService',
  function($location, OpenSearchService) {

    return {
      template: function(elem, attrs) {
        if (!attrs.version || OpenSearchService.versionCheck(attrs.version)) {
          var target = attrs.target;
          var text = attrs.text;
          var icon = attrs.icon;
          return '<a href="#!' + target + '">' +
              '<i class="fa fa-fw ' + icon + '"></i> ' + text +
              '</a>';
        } else {
          return '';
        }
      }
    };
  }

]);
