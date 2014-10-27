'use strict';

var Morph = angular.module('Morph', ['ngClipboard']);

Morph.config(['ngClipProvider', function (ngClipProvider) {
	ngClipProvider.setPath("../assets/js/ZeroClipboard.swf");
}]);

Morph.controller('MorphCtrl', function ($scope, $rootScope, $location) {

	$scope.selectMorph = function (m) {
		$scope.morpher = m;
		$location.hash(m.getId());
		$scope.inputChange();
	};

	$scope.inputChange = function () {
		$scope.output = $scope.morpher.morph($scope.input);
	};
	$scope.clear = function () {
		$scope.input = "";
	};

	$scope.copyClick = function () {
		$scope.showToast('Text has been copied.', 2500);
	};
	$scope.fallback = function (copy) {
		$scope.showToast('Could not copy. Press cmd+c to copy the text above.', 3500);
	};

	$scope.showToast = function (msg, duration) {
		$scope.toast = msg;
		$('.toast').fadeIn(400);
		setTimeout($scope.hideToast, duration);
	};
	$scope.hideToast = function () {
		$('.toast').fadeOut(500);
	};

	$scope.morphs = Morphs.build();

	$scope.input = ["To invoke the hive-mind representing chaos.",
		"Invoking the feeling of chaos.",
		"With out order.",
		"The Nezperdian hive-mind of chaos. Zalgo.",
		"He who Waits Behind The Wall.",
		"ZALGO!"].join('\n');

	var splitHash = function () {
		var hash = $location.hash().split('=');
		var mo = $scope.morphs.filter(function (m) {
			return m.getId() == hash[0];
		})[0];
		var text = null;
		if (hash[1]) {
			hash.shift();
			text = hash.join('=');
		}
		return {mo: mo, text: text};
	};

	var param = splitHash();
	if (param.text) $scope.input = param.text;
	$scope.selectMorph(param.mo || $scope.morphs[0]);

	$rootScope.$on('$locationChangeSuccess', function (locationChangeObj, path) {
		var param = splitHash();
		if ((param.mo) && ($scope.morpher != param.mo)) {
			if (param.text) $scope.input = param.text;
			$scope.selectMorph(param.mo);
		} else if (param.text) {
			$scope.input = param.text;
			$scope.inputChange();
		}
	});

	$scope.loaded = true;
});

