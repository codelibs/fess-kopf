kopf.factory('ExternalSettingsService', ['DebugService',
  function(DebugService) {

    var KEY = 'kopfSettings';

    var ES_HOST = 'location';

    var OPENSEARCH_ROOT_PATH = 'opensearch_root_path';
    var ES_ROOT_PATH = 'elasticsearch_root_path'; // Deprecated: for backward compatibility

    var WITH_CREDENTIALS = 'with_credentials';

    var REFRESH_RATE = 'refresh_rate';

    var THEME = 'theme';

    var UPDATABLE_SETTINGS = [REFRESH_RATE, THEME];

    this.settings = null;

    this.getSettings = function() {
      if (!isDefined(this.settings)) {
        this.settings = this.fetchSettings();
        var localSettings = this.loadLocalSettings();
        this.updateSettings(localSettings);
      }
      return this.settings;
    };

    this.fetchSettings = function() {
      var settings = {};
      var params = {
        type: 'GET',
        url: './kopf_external_settings.json',
        dataType: 'json',
        async: false
      };
      var settingsFuture = $.ajax(params);
      settingsFuture.done(function(data) {
        try {
          Object.keys(data).forEach(function(setting) {
            settings[setting] = data[setting];
          });
        } catch (error) {
          throw {
            message: 'Error processing external settings',
            body: data
          };
        }
      });
      settingsFuture.fail(function(error) {
        throw {
          message: 'Error fetching external settings from file',
          body: error
        };
      });
      return settings;
    };

    /**
     * Gets the OpenSearch host URL from settings
     *
     * @returns {string} OpenSearch host URL
     */
    this.getOpenSearchHost = function() {
      return this.getSettings()[ES_HOST];
    };

    // Deprecated: Use getOpenSearchHost() instead
    this.getElasticsearchHost = function() {
      return this.getOpenSearchHost();
    };

    /**
     * Gets the OpenSearch root path from settings.
     * Prefers opensearch_root_path but falls back to elasticsearch_root_path
     * for backward compatibility.
     *
     * @returns {string} OpenSearch root path
     */
    this.getOpenSearchRootPath = function() {
      var settings = this.getSettings();
      // Prefer opensearch_root_path, fall back to elasticsearch_root_path
      if (isDefined(settings[OPENSEARCH_ROOT_PATH])) {
        return settings[OPENSEARCH_ROOT_PATH];
      }
      return settings[ES_ROOT_PATH];
    };

    // Deprecated: Use getOpenSearchRootPath() instead
    this.getElasticsearchRootPath = function() {
      return this.getOpenSearchRootPath();
    };

    this.withCredentials = function() {
      return this.getSettings()[WITH_CREDENTIALS];
    };

    this.getRefreshRate = function() {
      return this.getSettings()[REFRESH_RATE];
    };

    this.setRefreshRate = function(rate) {
      this.getSettings()[REFRESH_RATE] = rate;
      this.saveSettings();
    };

    this.getTheme = function() {
      return this.getSettings()[THEME];
    };

    this.setTheme = function(theme) {
      this.getSettings()[THEME] = theme;
      this.saveSettings();
    };

    this.saveSettings = function() {
      var settings = {};
      for (var setting in this.settings) {
        if (UPDATABLE_SETTINGS.indexOf(setting) >= 0) {
          settings[setting] = this.settings[setting];
        }
      }
      localStorage.setItem(KEY, JSON.stringify(settings));
    };

    this.loadLocalSettings = function() {
      var settings = {};
      try {
        var content = localStorage.getItem(KEY);
        if (content) {
          settings = JSON.parse(content);
        }
      } catch (error) {
        DebugService.debug('Error while loading settings from local storage');
      }
      return settings;
    };

    this.updateSettings = function(settings) {
      if (settings) {
        for (var setting in settings) {
          if (UPDATABLE_SETTINGS.indexOf(setting) >= 0) {
            this.settings[setting] = settings[setting];
          }
        }
      }
    };

    return this;

  }]);
