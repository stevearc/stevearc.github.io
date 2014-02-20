angular.module('blog', [])

.controller('BaseCtrl', ['$scope', function($scope) {

}])

.controller('SyntaxToggleCtrl', ['$scope', function($scope) {
  $scope.style = 'solarizedlight';
  $scope.select = function(style) {
    $scope.style = style;
    document.getElementById('syntax-css').setAttribute('href', '/css/' + style + '.css');
  };
  $scope.select($scope.style);
}]);
