kopf.controller('NodesController', ['$scope', 'ConfirmDialogService',
  'AlertService', 'OpenSearchService', 'AppState',
  function($scope, ConfirmDialogService, AlertService, OpenSearchService,
           AppState) {

    $scope.sortBy = 'name';
    $scope.reverse = false;

    $scope.setSortBy = function(field) {
      if ($scope.sortBy === field) {
        $scope.reverse = !$scope.reverse;
      }
      $scope.sortBy = field;
    };

    $scope.filter = AppState.getProperty(
        'NodesController',
        'filter',
        new NodeFilter('', true, true, true, 0)
    );

    $scope.nodes = [];

    $scope.$watch('filter',
        function(newValue, oldValue) {
          $scope.refresh();
        },
        true);

    $scope.$watch(
        function() {
          return OpenSearchService.cluster;
        },
        function(newValue, oldValue) {
          $scope.refresh();
        }
    );

    $scope.refresh = function() {
      var nodes = OpenSearchService.getNodes();
      $scope.nodes = nodes.filter(function(node) {
        return $scope.filter.matches(node);
      });
    };

    $scope.showNodeStats = function(nodeId) {
      OpenSearchService.getNodeStats(nodeId,
          function(nodeStats) {
            $scope.displayInfo('stats for ' + nodeStats.name, nodeStats.stats);
          },
          function(error) {
            AlertService.error('Error while loading node stats', error);
          }
      );
    };

  }

]);
