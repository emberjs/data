/* global Symbol */
// Partially implements Headers from the Fetch API
// https://developer.mozilla.org/en-US/docs/Web/API/Headers
function HeadersPolyfill(headers) {
  headers = headers || {};
  this.headers = {};

  for (var header in headers) {
    this.headers[header] = headers[header].split(', ');
  }
}

HeadersPolyfill.prototype.append = function(header, value) {
  header = header.toLowerCase();
  if (!this.has(header)) {
    this.headers[header] = [];
  }

  this.headers[header].push(value);
};

HeadersPolyfill.prototype.delete = function(header) {
  delete this.headers[header.toLowerCase()];
};

HeadersPolyfill.prototype.entries = function() {
  var entries = [];

  for (var key in this.headers) {
    var values = this.headers[key];
    for (var index = 0; index < values.length; ++index ) {
      entries.push([key, values[index]]);
    }
  }

  return entries[Symbol.iterator]();
};

HeadersPolyfill.prototype.get = function(header) {
  return this.getAll(header)[0] || null;
};

HeadersPolyfill.prototype.getAll = function(header) {
  return this.headers[header.toLowerCase()] || [];
};

HeadersPolyfill.prototype.has = function(header) {
  return this.headers[header.toLowerCase()] !== undefined;
};

HeadersPolyfill.prototype.keys = function() {
  var entries = [];

  for (var key in this.headers) {
    var values = this.headers[key];
    for (var index = 0; index < values.length; ++index ) {
      entries.push(key);
    }
  }

  return entries[Symbol.iterator]();
};

HeadersPolyfill.prototype.set = function(header, value) {
  header = header.toLowerCase();
  this.headers[header] = [value];
};

HeadersPolyfill.prototype.values = function() {
  var entries = [];

  for (var key in this.headers) {
    var values = this.headers[key];
    for (var index = 0; index < values.length; ++index ) {
      entries.push(values[index]);
    }
  }

  return entries[Symbol.iterator]();
};

export default HeadersPolyfill;
