kopf.controller('NavbarController', ['$scope', '$location',
  'ExternalSettingsService', 'OpenSearchService', 'AlertService',
  'HostHistoryService',
  function($scope, $location, ExternalSettingsService, OpenSearchService,
           AlertService, HostHistoryService) {

    $scope.new_refresh = '' + ExternalSettingsService.getRefreshRate();
    $scope.theme = ExternalSettingsService.getTheme();
    $scope.new_host = '';
    $scope.current_host = OpenSearchService.getHost();
    $scope.host_history = HostHistoryService.getHostHistory();

    $scope.clusterStatus = undefined;
    $scope.clusterName = undefined;
    $scope.fetchedAt = undefined;

    $scope.$watch(
        function() {
          return OpenSearchService.getHost();
        },
        function(newValue, oldValue) {
          $scope.current_host = OpenSearchService.getHost();
        }
    );

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

    $scope.handleConnectToHost = function(event) {
      if (event.keyCode == 13 && notEmpty($scope.new_host)) {
        $scope.connectToHost($scope.new_host);
      }
    };

    $scope.connectToHost = function(host) {
      try {
        OpenSearchService.connect(host);
        HostHistoryService.addToHistory(OpenSearchService.connection);
        $scope.host_history = HostHistoryService.getHostHistory();
      } catch (error) {
        AlertService.error('Error while connecting to new target host', error);
      } finally {
        $scope.current_host = OpenSearchService.connection.host;
        OpenSearchService.refresh();
      }
    };

    $scope.changeRefresh = function() {
      ExternalSettingsService.setRefreshRate($scope.new_refresh);
    };

    $scope.changeTheme = function() {
      ExternalSettingsService.setTheme($scope.theme);
    };

  }
]);
