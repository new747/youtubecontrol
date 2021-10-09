const youtubecontrol = {
	deniedMsg: undefined,
	dataUrl: null,
	imgSrcSchedule: null,
	imgSrcIgnore: null,
	getContainsTimeTo: (from, durationHours, now) => {
		const dtFrom = new Date(from);
		const dtTo = new Date(dtFrom.getTime() + (durationHours * 60 * 60 * 1000));
		return dtFrom <= now && now <= dtTo ? dtTo : null;
	},
	fetchJsonData: () => {
		console.log('fetchJsonData called -> ' + youtubecontrol.dataUrl);
		fetch(youtubecontrol.dataUrl)
			.then(res => res.json()) // フェッチしたデータを JSON 形式に変換
			.then(jsonData => {youtubecontrol.jsonData = jsonData}); // JSONを保持
	},
	deny: (msg) => {
		document.getElementsByClassName('video-stream html5-main-video')[0].pause()
		if (msg != youtubecontrol.deniedMsg ) {
			console.log('deny called. because ' + msg);
		}
		youtubecontrol.deniedMsg = msg;
	},
	interval: () => {
//		console.log('interval called');
		const img = document.getElementById('img');
		if (img.src == youtubecontrol.imgSrcIgnore) {
			return;
		}
		
		if (youtubecontrol.deniedMsg && window.location.href.match('https://www.youtube.com/watch\?')) {
			console.log('denied at ' + window.location.href);
			youtubecontrol.deny(youtubecontrol.deniedMsg);
			alert(youtubecontrol.deniedMsg);

			youtubecontrol.deniedMsg = undefined;
			window.location.href = 'https://www.youtube.com/feed/subscriptions';
			return;
		}

		const now = new Date();
		if (now.getMinutes() % 5 == 0 && now.getSeconds() < 5) {	// 5分毎に jsonData を再取得
			youtubecontrol.fetchJsonData();
		}

		let imgTooltip = '';
		const forceControl = youtubecontrol.jsonData.forceControl[0];
		// force denied?
		const deniedTimeTo = youtubecontrol.getContainsTimeTo(forceControl.deniedFrom, forceControl.durationHours, now);
		if (deniedTimeTo) {
			youtubecontrol.deny(deniedTimeTo + ' までは禁止時間です');
			imgTooltip = deniedTimeTo + ' までは禁止';
		}

		// force allowed?
		const allowedTimeTo = youtubecontrol.getContainsTimeTo(forceControl.allowedFrom, forceControl.durationHours, now);
		if (allowedTimeTo) {
			imgTooltip = allowedTimeTo + ' まで許可';
		}

		// schedule denied?
		let dayOfWeek = now.getDay();
		try {
			if (now.getTime() - new Date(forceControl.dateToBeTreatAsHoliday).getTime() < 24 * 60 * 60 * 1000) {
				dayOfWeek = 0;
			}
		} catch {
			// ignore
		}
		const hhmm = ('00' + now.getHours()).slice(-2) + ':' + ('00' + now.getMinutes()).slice(-2);
		const schedules = youtubecontrol.imgSrcSchedule == img.src ? youtubecontrol.jsonData.schedule : youtubecontrol.jsonData.schedule2;
		const deniedSchedule = schedules.find(elem => elem.day == dayOfWeek && elem.from <= hhmm && hhmm <= elem.to);
		if (!deniedTimeTo && !allowedTimeTo && deniedSchedule) {
			youtubecontrol.deny(deniedSchedule.from + ' から ' + deniedSchedule.to + ' までは禁止時間です');
		}

		imgTooltip = (!imgTooltip ? '' : '\n') + '---- 今日の禁止時間残 ----';
		schedules.filter(elem => elem.day == dayOfWeek && elem.to >= hhmm ).forEach(elem => imgTooltip = imgTooltip + '\n' + elem.from + '～' + elem.to);
		img.title = imgTooltip;
	}
};

window.onload = function() {
	youtubecontrol.fetchJsonData();

	const intervalId = setInterval(youtubecontrol.interval, 5 * 1000)	// 5秒周期

	const intervalId2 = setInterval(function() {
		if (document.getElementById('img').src == youtubecontrol.imgSrcIgnore) {
			return;
		}

		document.querySelectorAll('div#secondary').forEach(elem => {elem.hidden = true});
		const subscribeButtons = document.querySelectorAll('ytd-subscribe-button-renderer > tp-yt-paper-button');
		subscribeButtons.forEach(btn => {
			btn.hidden = true;
			
			if (window.location.href.match('https://www.youtube.com/watch\?') && btn.closest('#subscribe-button') && !btn.hasAttribute('subscribed')) {
				window.location.href = 'https://www.youtube.com/feed/subscriptions';
			}
		});
	}, 1500);
};
