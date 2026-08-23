module.exports = function(grunt) {

  grunt.initConfig({
    clean: {
      dist: {
        src: ['_site/dist']
      }
    },
    watch: {
      scripts: {
        files: ['src/kopf/**/*.*', 'src/kopf/*.*'],
        tasks: ['build'],
        options: {
          spawn: false
        }
      }
    },
    copy: {
      main: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['src/lib/ace/mode-json.js'],
            dest: './_site/dist/'
          },
          {
            expand: true,
            flatten: true,
            src: ['src/lib/ace/worker-json.js'],
            dest: './_site/dist/'
          },
          {
            expand: true,
            flatten: true,
            src: ['src/lib/ace/ext-language_tools.js'],
            dest: './_site/dist/'
          },
          {
            expand: true,
            flatten: true,
            src: ['src/lib/angularjs/*.map'],
            dest: './_site/dist/'
          },
          {
            expand: true,
            flatten: true,
            src: ['src/kopf/theme-kopf.js'],
            dest: './_site/dist/'
          },
          {
            expand: true,
            flatten: true,
            src: ['src/kopf/css/dark_style.css'],
            dest: './_site/dist/'
          },
          {
            expand: true,
            flatten: true,
            src: ['src/kopf/css/fess_style.css'],
            dest: './_site/dist/'
          },
          {
            expand: true,
            flatten: true,
            src: ['src/kopf/css/light_style.css'],
            dest: './_site/dist/'
          }
        ]
      }
    },
    concat: {
      // grunt-contrib-concat silently skips sources that do not exist.
      // A stale path then disappears from the shipped bundle without a
      // word - which is how a dangling gist_share.css reference lived
      // here for about twelve years. `nonull` must sit on each target
      // below (a sibling of src/dest), not under a shared `options`
      // block - grunt's file-list expansion only reads it from there.
      vendorjs: {
        nonull: true,
        src: [
          'src/lib/jquery/jquery-1.12.4.min.js',
          'src/lib/angularjs/angular.min.js',
          'src/lib/angularjs/angular-route.min.js',
          'src/lib/ace/ace.js',
          'src/lib/jsontree/jsontree.min.js',
          'src/lib/bootstrap/js/bootstrap.js',
          'src/lib/csv/csv.js',
          'src/lib/csv/jquery.csv.js',
          'src/lib/angular-tree-dnd/ng-tree-dnd.js',
          'src/lib/angularjs/angular-animate.min.js',
          'src/lib/typeahead/typeahead.js'
        ],
        dest: '_site/dist/lib.js'
      },
      vendorcss: {
        nonull: true,
        src: [
          'src/lib/bootstrap/css/bootstrap.css',
          'src/lib/angular-tree-dnd/ng-tree-dnd.css'
        ],
        dest: '_site/dist/lib.css'
      },
      appjs: {
        nonull: true,
        src: [
          'src/kopf/kopf.js',
          'src/kopf/opensearch/*.js',
          'src/kopf/models/*.js',
          'src/kopf/services/*.js',
          'src/kopf/filters/*.js',
          'src/kopf/directives/*.js',
          'src/kopf/controllers/*.js',
          'src/kopf/util.js',
        ],
        dest: '_site/dist/kopf.js'
      },
      appcss: {
        nonull: true,
        src: [
          'src/kopf/css/common.css',
          'src/kopf/css/aliases.css',
          'src/kopf/css/analysis.css',
          'src/kopf/css/explain.css',
          'src/kopf/css/cluster_health.css',
          'src/kopf/css/cluster_overview.css',
          'src/kopf/css/navbar.css',
          'src/kopf/css/rest_client.css',
          'src/kopf/css/repository.css',
          'src/kopf/css/nodes.css',
          'src/kopf/css/hotthreads.css'
        ],
        dest: '_site/dist/kopf.css'
      }

    },
    connect: {
      server: {
        options: {
          port: 9000,
          base: '.',
          keepalive: true
        }
      }
    },
    jshint: {
      kopf: {
        src: [
          'src/kopf/kopf.js',
          'src/kopf/*/*.js',
          'src/kopf/util.js',
        ]
      }
    },
    jscs: {
      src: ['src/kopf/**/*.js'],
      options: {
        preset: 'google',
        excludeFiles: ['src/kopf/theme-kopf.js'],
        requireCamelCaseOrUpperCaseIdentifiers: "ignoreProperties"
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks("grunt-jscs");
  grunt.registerTask('build',
      ['clean', 'jshint', 'copy', 'concat', 'jscs']);
  grunt.registerTask('server',
      ['clean', 'jshint', 'copy', 'concat', 'connect:server']);
};
