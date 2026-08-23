kopf.controller('NavbarController', ['$scope', '$location',
  'ExternalSettingsService', 'OpenSearchService', 'AlertService',
  function($scope, $location, ExternalSettingsService, OpenSearchService,
           AlertService) {

    $scope.new_refresh = '' + ExternalSettingsService.getRefreshRate();
    $scope.theme = ExternalSettingsService.getTheme();

    $scope.clusterStatus = undefined;
    $scope.clusterName = undefined;
    $scope.fetchedAt = undefined;

    $scope.$watch(
        function() {
          return OpenSearchService.cluster;
        },
        function(newValue, oldValue) {
          if (isDefined(OpenSearchService.cluster)) {
            $scope.clusterStatus = OpenSearchService.cluster.status;
            $scope.clusterName = OpenSearchService.cluster.name;
            $scope.fetchedAt = OpenSearchService.cluster.fetched_at;
            $scope.clientName = OpenSearchService.cluster.clientName;
          } else {
            $scope.clusterStatus = undefined;
            $scope.clusterName = undefined;
            $scope.fetchedAt = undefined;
            $scope.clientName = undefined;
          }
        }
    );

    $scope.changeRefresh = function() {
      ExternalSettingsService.setRefreshRate($scope.new_refresh);
    };

    $scope.changeTheme = function() {
      ExternalSettingsService.setTheme($scope.theme);
    };

  }
]);
