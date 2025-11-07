kopf.controller('ClusterStatsController', ['$scope', 'OpenSearchService',
  function($scope, OpenSearchService) {

    $scope.cluster = undefined;

    $scope.$watch(
        function() {
          return OpenSearchService.cluster;
        },
        function(newValue, oldValue) {
          $scope.cluster = OpenSearchService.cluster;
        }
    );

  }
]);
