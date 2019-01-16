/**
Helper functions for tasks
*/

module.exports.asyncLoop= (iterations, func, callback) =>  {

  var index = 0;
  var done = false;
  var loop = {
    next: function() {
        if (done) {
            return;
        }

        if (index < iterations) {
            index++;
            func(loop);

        } else {
            done = true;
            callback("Completed async loop");
        }
    },
    iteration: function() {
        return index - 1;
    },
    break: function() {
        done = true;
        callback("Completed async loop");
    }
  };
  
  loop.next();

  return loop;
}
