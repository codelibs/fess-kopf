kopf.controller('ClusterSettingsController', ['$scope', '$location', '$timeout',
  'AlertService', 'OpenSearchService',
  function($scope, $location, $timeout, AlertService, OpenSearchService) {

    $scope.initializeController = function() {
      $('#cluster_settings_option a').tab('show');
      $('#cluster_settings_tabs a:first').tab('show');
      $('.setting-info').popover();
      $scope.active_settings = 'transient'; // remember last active?
      $scope.settings = new ClusterSettings(OpenSearchService.cluster.settings);
    };

    $scope.save = function() {
      var settings = JSON.stringify($scope.settings, undefined, '');
      OpenSearchService.updateClusterSettings(settings,
          function(response) {
            AlertService.success('Cluster settings were successfully updated',
                response);
            OpenSearchService.refresh();
          },
          function(error) {
            AlertService.error('Error while updating cluster settings', error);
          }
      );
    };
  }
]);
