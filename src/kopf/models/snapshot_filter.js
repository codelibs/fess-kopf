function SnapshotFilter(name) {

  this.name = name;

  this.clone = function() {
    return new SnapshotFilter(this.name);
  };

  this.getSorting = function() {
    return function(a, b) {
      return a.name.localeCompare(b.name);
    };
  };

  this.equals = function(other) {
    return (other !== null &&
      this.name == other.name);
  };

  this.isBlank = function() {
    return !notEmpty(this.name);
  };

  this.matches = function(snapshot) {
    if (this.isBlank()) {
      return true;
    } else {
      var matches = true;
      if (notEmpty(this.name)) {
        matches = snapshot.name.toLowerCase().indexOf(
            this.name.toLowerCase()) != -1;
      }
      return matches;
    }
  };

}
