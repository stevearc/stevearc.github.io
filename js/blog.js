angular.module('blog', [])

.controller('SyntaxToggleCtrl', ['$scope', function($scope) {
  $scope.style = 'solarizedlight';
  $scope.select = function(style) {
    $scope.style = style;
    document.getElementById('syntax-css').setAttribute('href', '/css/' + style + '.css');
  };
  $scope.select($scope.style);
}]);
