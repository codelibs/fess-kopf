kopf.controller('HotThreadsController', ['$scope', 'OpenSearchService',
  'AlertService',
  function($scope, OpenSearchService, AlertService) {

    $scope.node = undefined;

    $scope.nodes = [];

    $scope.type = 'cpu';

    $scope.types = ['cpu', 'wait', 'block'];

    $scope.interval = '500ms';

    $scope.threads = 3;

    $scope.ignoreIdleThreads = true;

    $scope.nodesHotThreads = undefined;

    $scope.execute = function() {
      OpenSearchService.getHotThreads($scope.node, $scope.type, $scope.threads,
          $scope.interval, $scope.ignoreIdleThreads,
          function(result) {
            $scope.nodesHotThreads = result;
          },
          function(error) {
            AlertService.error('Error while fetching hot threads', error);
            $scope.nodesHotThreads = undefined;
          }
      );
    };

    $scope.$watch(
        function() {
          return OpenSearchService.cluster;
        },
        function(current, previous) {
          $scope.nodes = OpenSearchService.getNodes();
        },
        true
    );

    $scope.initializeController = function() {
      $scope.nodes = OpenSearchService.getNodes();
    };

  }

]);
