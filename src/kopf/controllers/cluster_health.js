kopf.controller('ClusterHealthController', ['$scope', '$location', '$timeout',
  '$sce', 'AlertService', 'OpenSearchService',
  function($scope, $location, $timeout, $sce, AlertService,
           OpenSearchService) {

    $scope.results = null;

    $scope.initializeController = function() {
      $('#cluster_health_option a').tab('show');
      $scope.results = null;
      // selects which info should be retrieved
      $scope.retrieveHealth = true;
      $scope.retrieveState = true;
      $scope.retrieveStats = true;
      $scope.retrieveHotThreads = true;
    };

    $scope.loadClusterHealth = function() {
      var results = {};
      $scope.results = null;
      var infoId = AlertService.info('Loading cluster health state. ' +
          'This could take a few moments.', {}, 30000);
      OpenSearchService.getClusterDiagnosis($scope.retrieveHealth,
          $scope.retrieveState, $scope.retrieveStats, $scope.retrieveHotThreads,
          function(responses) {
            $scope.state = '';
            if (!(responses instanceof Array)) {
              // so logic bellow remains the same in case result is not an array
              responses = [responses];
            }
            var idx = 0;
            if ($scope.retrieveHealth) {
              results.health_raw = responses[idx++];
              var htmlHealth = JSONTree.create(results.health_raw);
              results.health = $sce.trustAsHtml(htmlHealth);
            }
            if ($scope.retrieveState) {
              results.state_raw = responses[idx++];
              var htmlState = JSONTree.create(results.state_raw);
              results.state = $sce.trustAsHtml(htmlState);
            }
            if ($scope.retrieveStats) {
              results.stats_raw = responses[idx++];
              var htmlStats = JSONTree.create(results.stats_raw);
              results.stats = $sce.trustAsHtml(htmlStats);
            }
            if ($scope.retrieveHotThreads) {
              results.hot_threads = responses[idx];
            }
            $scope.results = results;
            $scope.state = '';
            AlertService.remove(infoId);
          },
          function(failedRequest) {
            AlertService.remove(infoId);
            AlertService.error('Error while retrieving cluster health ' +
                'information', failedRequest.data);
          }
      );
    };

  }
]);
