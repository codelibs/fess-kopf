function Version(version) {
  var checkVersion = new RegExp('(\\d+)\\.(\\d+)\\.(\\d+)\\.*');
  var major;
  var minor;
  var patch;
  var value = version;
  var valid = false;

  if (checkVersion.test(value)) {
    valid = true;
    var parts = checkVersion.exec(version);
    major = parseInt(parts[1]);
    minor = parseInt(parts[2]);
    patch = parseInt(parts[3]);
  }

  this.isValid = function() {
    return valid;
  };

  this.getMajor = function() {
    return major;
  };

  this.getMinor = function() {
    return minor;
  };

  this.getPatch = function() {
    return patch;
  };

  this.getValue = function() {
    return value;
  };

  // True when this version is the same as, or newer than, other.
  this.isAtLeast = function(other) {
    if (major !== other.getMajor()) {
      return major > other.getMajor();
    }
    if (minor !== other.getMinor()) {
      return minor > other.getMinor();
    }
    return patch >= other.getPatch();
  };

}
