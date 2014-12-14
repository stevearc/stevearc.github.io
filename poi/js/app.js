angular.module('poi', ['ngAnimate', 'ui.bootstrap'])

.factory('Browser', function() {
  return {
    mobileCheck: function() {
      var check = false;
      (function(a,b){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
      return check;
    }
  }
})

.controller('BaseController', ['$scope', function($scope) {
  $scope.getClass = function(length, idx) {
    if (idx < 3 * Math.floor(length/3)) {
      return 'col-md-4';
    } else if (length % 3 == 1) {
      return 'col-md-offset-4 col-md-4';
    } else if (idx % 3 == 0) {
      return 'col-md-offset-2 col-md-4';
    } else {
      return 'col-md-4';
    }
  }
  $scope.videos = [
  {
    'title': "Introduction",
    'videos': [
      {
        'id': 'zI9XK3AkJSA',
        'image': '/poi/img/grip.gif',
        'title': "How to hold your poi",
        'description': "A brief overview of many different ways to grip poi."
      }
    ]
  },
  {
    'title': "Weaves",
    'videos': [
      {
        'id': 'xm_sw1KePHg',
        'image': '/poi/img/2beat.gif',
        'title': "2-beat weave",
        'description': ""
      },
      {
        'id': 'PiGuTsaoE1w',
        'image': '/poi/img/3beat.gif',
        'title': "3-beat weave",
        'description': ""
      },
      {
        'id': 'Ky85zHnsCug',
        'image': '/poi/img/3beat_rev.gif',
        'title': "3-beat weave (reverse)",
        'description': ""
      },
      {
        'id': 'Byh5n6As1cM',
        'image': '/poi/img/3beat_turn.gif',
        'title': "Turning with 3-beat weaves",
        'description': ""
      },
      {
        'id': 'sPFYB4iAv2g',
        'image': '/poi/img/buzzsaw.gif',
        'title': "Buzzsaw",
        'description': ""
      },
      {
        'id': 'G_9geSAjcxw',
        'image': '/poi/img/windmill.gif',
        'title': "Windmill",
        'description': ""
      },
      {
        'id': 'J06CEkMOCnc',
        'image': '/poi/img/fountain.gif',
        'title': "Fountain",
        'description': ""
      },
      {
        'id': 'Xms5gf-BO_Y',
        'image': '/poi/img/lockouts.gif',
        'title': "Lockouts",
        'description': "A technique for mixing up standard weave patterns."
      },
      {
        'id': 'TLOJcT6wdSI',
        'image': '/poi/img/crossers.gif',
        'title': "Crossers",
        'description': ""
      },
      {
        'id': 'C_Mbmq3jFNg',
        'image': '/poi/img/crosser_variations.gif',
        'title': "Crosser variations",
        'description': ""
      },
      {
        'id': 'Hl1rwfGV3KU',
        'image': '/poi/img/archer.gif',
        'title': "Archer weave",
        'description': "A variation on the 3-beat that leads into other movements."
      }
    ]
  },
  {
    'title': "Reels",
    'videos': [
      {
        'id': 'r4-8yrkHEbQ',
        'image': '/poi/img/reels.gif',
        'title': "Hip and shoulder reels",
        'description': ""
      },
      {
        'id': 'Pr0BIlceb6g',
        'image': '/poi/img/chase_the_sun.gif',
        'title': "Chase the sun",
        'description': ""
      },
      {
        'id': 'ry9X6Wqbqhc',
        'image': '/poi/img/hip_reels_split.gif',
        'title': "Hip reels (split time)",
        'description': ""
      },
      {
        'id': 'HjdOg045zAo',
        'image': '/poi/img/chase_the_sun_split.gif',
        'title': "Chase the sun (split time)",
        'description': ""
      },
      {
        'id': 'PSHSsiNqMx4',
        'image': '/poi/img/dance.gif',
        'title': "Dancing to music",
        'description': "Principles for timing the motions of the poi to the beat of music."
      }
    ]
  }
  ];
  // TODO:
  // butterfly https://www.youtube.com/watch?v=qORuspB__sw  OR  https://www.youtube.com/watch?v=6FZA1WioN9Y
  // thread the needle https://www.youtube.com/watch?v=WcMk0kVRXyA
  // takeouts https://www.youtube.com/watch?v=zRWZeWkuQnU
}])

.controller('PanelController', ['$sce', '$scope', '$window', 'Browser',
    function($sce, $scope, $window, Browser) {
  $scope.$on('showVideo', function(event, video) {
    if (Browser.mobileCheck()) {
      $window.location = "https://www.youtube.com/watch?v=" + video.id;
    } else {
      $scope.video = video;
    }
  });

  $scope.getEmbedLink = function(id) {
    return $sce.trustAsResourceUrl('//www.youtube.com/embed/' + id)
  }

  $scope.closePanel = function() {
    $scope.video = null;
  }
}])

.directive('saThumbnail', ['$rootScope', function($rootScope) {
  return {
    'restrict': 'A',
    'replace': true,
    'templateUrl': '/poi/thumbnail_template.html',
    'scope': {
      'video': '=saThumbnail',
    },
    'link': function(scope, element, attrs) {
      scope.showVideo = function() {
        $rootScope.$broadcast('showVideo', scope.video);
      }
    }
  }
}])
