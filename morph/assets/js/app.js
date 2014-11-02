'use strict';

var Morph = angular.module('Morph', ['ngClipboard', 'ngSlider', 'ngSanitize', 'ui.router']);

Morph.config(['ngClipProvider', function (ngClipProvider) {
	ngClipProvider.setPath("../assets/js/ZeroClipboard.swf");
}]);

Morph.config(function ($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise("/typeface");
	$stateProvider
		.state('typeface', {
			url: "/typeface?id",
			reloadOnSearch: false,
			templateUrl: "assets/partials/typeface.html",
			controller: "TypefaceCtrl"
		})
		.state('typefaces', {
			url: "/typefaces",
			templateUrl: "assets/partials/typefaces.html",
			controller: "TypefacesCtrl"
		})
		.state('tool', {
			url: "/tool?id",
			templateUrl: "assets/partials/tools.html",
			controller: "ToolCtrl"
		});
});

Morph.controller('AppCtrl', function ($scope, $rootScope, $state) {

	$rootScope.getCurrentState=function(){
		return $state.current.name;
	};

	$rootScope.showToast = function (msg, duration) {
		$rootScope.toast = msg;
		$('.toast').fadeIn(400);
		setTimeout($rootScope.hideToast, duration);
	};
	$rootScope.hideToast = function () {
		$('.toast').fadeOut(500);
	};

	$rootScope.copyClick = function () {
		$rootScope.showToast('Text has been copied.', 2500);
	};
	$rootScope.fallback = function (copy) {
		$rootScope.showToast('Could not copy. Press cmd+c to copy the text above.', 3500);
	};

	$rootScope.typefaces = Morphs.buildTypefaces();
	$rootScope.typefaceByID = function (id) {
		return $rootScope.typefaces.filter(function (m) {
			return m.getId() == id;
		})[0];
	};
	$rootScope.tools = Morphs.buildTools();
	$rootScope.toolByID = function (id) {
		return $rootScope.tools.filter(function (m) {
			return m.getId() == id;
		})[0];
	};
	$rootScope.loaded = true;
});

Morph.controller('TypefaceCtrl', function ($rootScope, $scope, $state, $location, $stateParams) {

	$scope.selectTypeface = function (m) {
		$scope.typeface = m;
		$scope.inputChange();
		$location.search('id', m.getId());
	};

	$scope.input = ["To invoke the hive-mind representing chaos.",
		"Invoking the feeling of chaos.",
		"With out order.",
		"The Nezperdian hive-mind of chaos. Zalgo.",
		"He who Waits Behind The Wall.",
		"ZALGO!"].join('\n');
	$scope.output = '';

	$scope.inputChange = function () {
		$scope.output = $scope.typeface.morph($scope.input);
	};
	$scope.$watch('input', $scope.inputChange);

	$scope.selectTypeface($rootScope.typefaceByID($stateParams.id) || $rootScope.typefaces[0]);

	$rootScope.$on('$locationChangeSuccess', function (locationChangeObj, path) {
		if (($state.current.name == 'typeface') &&
			($scope.typeface) && ($scope.typeface.getId() !== $location.search().id))
			$scope.selectTypeface($rootScope.typefaceByID($location.search().id) || $rootScope.typefaces[0]);
	});

});

Morph.controller('TypefacesCtrl', function ($rootScope, $scope, $timeout) {

	$scope.input = ["To invoke the hive-mind representing chaos.",
		"Invoking the feeling of chaos.",
		"With out order.",
		"The Nezperdian hive-mind of chaos. Zalgo.",
		"He who Waits Behind The Wall.",
		"ZALGO!"].join('\n');

	var worker = 0;

	var responsiveMap = function (collection, id, evalFn) {
		var index = 0;

		function enQueueNext() {
			$timeout(function () {
				evalFn(collection[index], id);
				index++;
				var abort = worker !== id;
				if ((!abort) && (index < collection.length))
					enQueueNext();
			}, 1);
		}

		// Start off the process
		enQueueNext();

	};

	$scope.inputChange = function () {
		responsiveMap($rootScope.typefaces, ++worker, function (m, sender) {
			m.preview = m.morph($scope.input);
		});
	};

	$scope.$watch('input', $scope.inputChange);

});

Morph.controller('ToolCtrl', function ($rootScope, $scope, $state, $location, $stateParams) {

	$scope.selectTool = function (m) {
		$scope.tool = m;
		$scope.inputChange();
		$location.search('id', m.getId());
	};

	$scope.input = [10, 30, 60, 100, 40, 20].join(', ');
	$scope.output = '';

	$scope.inputChange = function () {
		$scope.output = $scope.tool.morph($scope.input);
	};
	$scope.$watch('input', $scope.inputChange);

	$scope.selectTool($rootScope.toolByID($stateParams.id) || $rootScope.tools[0]);

	$rootScope.$on('$locationChangeSuccess', function (locationChangeObj, path) {
		if (($state.current.name == 'tool') &&
			($scope.tool) && ($scope.tool.getId() !== $location.search().id))
			$scope.selectTool($rootScope.toolByID($location.search().id) || $rootScope.tools[0]);
	});

});

Morph.directive('morphinput', function () {
	return {
		restrict: 'A',
		transclude: true,
		scope: {
			title: "@",
			value: "="
		},
		//replace: 'true',
		templateUrl: "assets/partials/input.html",
		link: function (scope, elem, attrs) {
			scope.clear = function () {
				scope.value = "";
			};
		}
	};
});

Morph.filter('linebreak', function ($filter) {
	return function (input) {
		if (input == null) return "";
		return input.replace(/\n/g, '<br/>');
	};
});

angular.module('ngSlider').run(['$templateCache', function ($templateCache) {
	$templateCache.put('ng-slider/slider-bar.tmpl.html',
		'<span ng-class="mainSliderClass" id="{{sliderTmplId}}">' +
		'<table><tr><td>' +
		'<div class="jslider-bg">' +
		'<i class="l"></i><i class="f"></i><i class="r"></i>' +
			// '<i class="v"></i>' +
		'</div>' +
		'<div class="jslider-pointer"></div>' +
		'<div class="jslider-pointer jslider-pointer-to"></div>' +
		'<div class="jslider-label"><span ng-bind-html="from"></span></div>' +
		'<div class="jslider-label jslider-label-to"><span ng-bind-html="to"></span>{{options.dimension}}</div>' +
		'<div class="jslider-value"><span></span>{{options.dimension}}</div>' +
		'<div class="jslider-value jslider-value-to"><span></span>{{options.dimension}}</div>' +
		'<div class="jslider-scale" id="{{sliderScaleDivTmplId}}"></div>' +
		'</td></tr></table>' +
		'</span>');
}]);

