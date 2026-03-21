function ClusterMapping(data) {

  this.getIndices = function() {
    return Object.keys(data);
  };

  this.getTypes = function(index) {
    var indexMapping = getProperty(data, index + '.mappings', {});
    return Object.keys(indexMapping);
  };

  this.getFields = function(index) {
    var fields = [];
    var indexMapping = getProperty(data, index + '.mappings', {});
    var extractFields = function(properties, prefix) {
      if (!isDefined(properties)) {
        return;
      }
      var keys = Object.keys(properties);
      for (var i = 0; i < keys.length; i++) {
        var field = keys[i];
        var fullName = prefix ? prefix + '.' + field : field;
        fields.push(fullName);
        if (isDefined(properties[field].properties)) {
          extractFields(properties[field].properties, fullName);
        }
      }
    };
    // Handle typeless mappings (OpenSearch 2.x+)
    if (isDefined(indexMapping.properties)) {
      extractFields(indexMapping.properties, '');
    } else {
      // Handle typed mappings (legacy)
      var types = Object.keys(indexMapping);
      for (var t = 0; t < types.length; t++) {
        var typeMapping = indexMapping[types[t]];
        if (isDefined(typeMapping) && isDefined(typeMapping.properties)) {
          extractFields(typeMapping.properties, '');
        }
      }
    }
    return fields;
  };

  this.getAllFields = function() {
    var allFields = [];
    var indices = this.getIndices();
    for (var i = 0; i < indices.length; i++) {
      var fields = this.getFields(indices[i]);
      for (var f = 0; f < fields.length; f++) {
        if (allFields.indexOf(fields[f]) === -1) {
          allFields.push(fields[f]);
        }
      }
    }
    return allFields.sort();
  };

}
