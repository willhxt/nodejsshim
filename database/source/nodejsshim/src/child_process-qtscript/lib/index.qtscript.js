// This is a stub for the `child_process` module. It doesn't do anything right now, but
// can be used with `require('child_process');` if something else needs `child_process` to exist.

// TODO: Use Qt classes to emulate Node.js's `child_process` module.
// @See: https://nodejs.org/dist/latest-v4.x/docs/api/child_process.html
var child_process = {

  /**
   * Emulate Node.js's child_process.exec function.
   * TODO: This is just a stub.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/child_process.html#child_process_child_process_exec_command_options_callback
   *
   * @param {String} command - The command to run, with space-separated arguments.
   * @param {Object | Function} [options] - The options object.
   * @param {Function} [connectionListener] - The callback function.
   * @returns {ChildProcess} - The ChildProcess object.
   */
  exec: function (command, options, callback) {
    var next = null;
    if (typeof options === 'function') {
      next = options;
    } else if (typeof callback === 'function') {
      next = callback;
    }

    if (next) {
      var error = null;
      var stdout = "";
      var stderr = null;

      next(error, stdout, stderr);
    }

    return {};
  },

  /**
   * Emulate Node.js's child_process.execFile function.
   * TODO: This is just a stub.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/child_process.html#child_process_child_process_execfile_file_args_options_callback
   *
   * @param {String} file - The name or path of the executable file to run.
   * @param {Array | Object | Function} [args] - List of string arguments.
   * @param {Object | Function} [options] - The options object.
   * @param {Function} [connectionListener] - The callback function.
   * @returns {ChildProcess} - The ChildProcess object.
   */
  execFile: function (file, args, options, callback) {
    var next = null;
    if (typeof args === 'function') {
      next = args;
    } else if (typeof options === 'function') {
      next = options;
    } else if (typeof callback === 'function') {
      next = callback;
    }

    if (next) {
      var error = null;
      var stdout = "";
      var stderr = null;

      next(error, stdout, stderr);
    }

    return {};
  },

  /**
   * Emulate Node.js's child_process.fork function.
   * TODO: This is just a stub.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/child_process.html#child_process_child_process_fork_modulepath_args_options
   *
   * @param {String} modulePath - The module to run in the child.
   * @param {Array | Object} [args] - List of string arguments.
   * @param {Object} [options] - The options object.
   * @returns {ChildProcess} - The ChildProcess object.
   */
  fork: function (modulePath, args, options) {
    return {};
  },

  /**
   * Emulate Node.js's child_process.spawn function.
   * TODO: This is just a stub.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/child_process.html#child_process_child_process_spawn_command_args_options
   *
   * @param {String} command - The command to run.
   * @param {Array | Object} [args] - List of string arguments.
   * @param {Object} [options] - The options object.
   * @returns {ChildProcess} - The ChildProcess object.
   */
  spawn: function (command, args, options) {
    return {};
  },

  /**
   * Emulate Node.js's child_process.execFileSync function.
   * TODO: This is just a stub.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/child_process.html#child_process_child_process_execfilesync_file_args_options
   *
   * @param {String} file - The name or path of the executable file to run.
   * @param {Array | Object} [args] - List of string arguments.
   * @param {Object} [options] - The options object.
   * @returns {String} - The stdout from the command
   */
  execFileSync: function (file, args, options) {
    return "";
  },

  /**
   * Emulate Node.js's child_process.execSync function.
   * TODO: This is just a stub.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/child_process.html#child_process_child_process_execsync_command_options
   *
   * @param {String} command - The command to run.
   * @param {Object} [options] - The options object.
   * @returns {String} - The stdout from the command
   */
  execSync: function (command, options) {
    return "";
  },

  /**
   * Emulate Node.js's child_process.spawnSync function.
   * TODO: This is just a stub.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/child_process.html#child_process_child_process_spawnsync_command_args_options
   *
   * @param {String} command - The command to run, with space-separated arguments.
   * @param {Array | Object} [args] - List of string arguments.
   * @param {Object} [options] - The options object.
   * @returns {ChildProcess} - The ChildProcess object.
   */
  spawnSync: function (command, args, options) {
    return {};
  }

};

module.exports = child_process;
