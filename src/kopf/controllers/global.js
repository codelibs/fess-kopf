// kopf targets OpenSearch 2.x and later. Anything older is unsupported.
var MIN_OPENSEARCH_MAJOR = 2;

kopf.controller('GlobalController', ['$scope', '$location', '$sce',
  'AlertService', 'OpenSearchService', 'ExternalSettingsService',
  'PageService',
  function($scope, $location, $sce, AlertService, OpenSearchService,
           ExternalSettingsService, PageService) {

    $scope.modal = new ModalControls();

    $scope.$watch(
        function() {
          return OpenSearchService.cluster;
        },
        function(newValue, oldValue) {
          var version = OpenSearchService.getVersion();
          if (version && version.isValid()) {
            if (version.getMajor() < MIN_OPENSEARCH_MAJOR) {
              AlertService.warn(
                  'This version of kopf supports OpenSearch 2.x and later',
                  'Detected OpenSearch ' + version.getValue()
              );
            }
          }
        }
    );

    $scope.getTheme = function() {
      return ExternalSettingsService.getTheme();
    };

    $scope.connect = function() {
      try {
        var host = 'http://localhost:9200'; // default
        if ($location.host() !== '') { // not opening from fs
          var url = $location.absUrl();
          var configured = ExternalSettingsService.getOpenSearchHost();
          if (notEmpty(configured)) {
            host = configured;
          } else if (url.indexOf('/_plugin/kopf') > -1) {
            host = url.substring(0, url.indexOf('/_plugin/kopf'));
          } else {
            host = $location.protocol() + '://' + $location.host() +
                ':' + $location.port();
          }
        }
        OpenSearchService.connect(host);
      } catch (error) {
        AlertService.error(error.message, error.body);
      }
    };

    $scope.connect();

    OpenSearchService.refresh();

    $scope.hasConnection = function() {
      return isDefined(OpenSearchService.cluster);
    };

    $scope.displayInfo = function(title, info) {
      $scope.modal.title = title;
      $scope.modal.info = $sce.trustAsHtml(JSONTree.create(info));
      $('#modal_info').modal({show: true, backdrop: true});
    };

  }
]);
