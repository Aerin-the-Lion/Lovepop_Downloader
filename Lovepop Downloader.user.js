// ==UserScript==
// @name         Lovepop Downloader
// @namespace    No URL
// @version      1.0
// @description  Lovepop Downloader for download all of monthly Photos and Videos each Models!
// @author       Aerin_the_Lion
// @match        *://lovepop.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lovepop.net
// @grant        GM_xmlhttpRequest
// @require  https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js
// ==/UserScript==

(function() {
    //動画の名前を格納(Array)
    var videoNames = [];
    var downloadMovieLinks = [];
    var downloadPictureLinks = [];
    var lovepopPhotoURL = "https://lovepop.net/r18/monthly/item.php?P="
    var photoImages = [];

async function main(){

    //プロフィール MOVIEを取得
    var profileElements = document.getElementsByClassName('c--subscription-item-detail-header l--subscription-item-detail-header')[0];
    var row = profileElements.getElementsByClassName('row')[0];
    var col = row.getElementsByClassName('col-12')[1];
    var subscriptionProfile = col.getElementsByClassName('l--subscription-profile-movie')[0];

    var h2TagsProfileVideoNames = subscriptionProfile.getElementsByTagName('h2');
    for (var j = 0; j < h2TagsProfileVideoNames.length; j++) {
        videoNames.push(h2TagsProfileVideoNames[j].innerText);
    }

    var profileMovieLink = subscriptionProfile.getElementsByClassName('c--subscription-image-and-movie-link subscription-profile-movie-link')[0];
    var profileDownloadButton = profileMovieLink.getElementsByClassName('this-download-button')[0];
    var profileLink = profileDownloadButton.getElementsByClassName('u--glow');
    for(var j = 0; j < profileLink.length; j++){
        downloadMovieLinks.push(profileLink[j].href);
    }

    //"モデル"のPHOTO & MOVIEの要素
    var elements = document.getElementsByClassName('l--subscription-image-and-movie-list-group');
    var row = elements[0].getElementsByClassName('row')[0];
    var col = row.getElementsByClassName('col-xl-4');
    for(var i = 0;i < col.length; i++){
        var movieList = col[i].getElementsByClassName('c--subscription-image-and-movie-list')[0];
        // ----------------------動画の名前を取得------------------------------------------
        var h3TagsVideoNames = movieList.getElementsByTagName('h3');
        for (var j = 0; j < h3TagsVideoNames.length; j++) {
            //console.log(h3TagsVideoNames[j].innerText);
            videoNames.push(h3TagsVideoNames[j].innerText);
        }
        // ----------------------動画のダウンロードリンクを取得-------------------------------
        var downloadMovieLink = movieList.getElementsByClassName('subscription-movies-link')[0];
        var thisDownloadButton = downloadMovieLink.getElementsByClassName('this-download-button')[0];
        var link = thisDownloadButton.getElementsByClassName('u--glow');
        for(var j = 0; j < link.length; j++){
            downloadMovieLinks.push(link[j].href);
        }

        // ----------------------画像のダウンロードリンクを取得-------------------------------
        var downloadPicturesLink = movieList.getElementsByClassName('subscription-images-link')[0];
        var thisPicturesDownloadButton = downloadPicturesLink.getElementsByClassName('this-photo-button')[0];
        var picturelink = thisPicturesDownloadButton.getElementsByClassName('u--glow');
        for(var j = 0; j < picturelink.length; j++){
            downloadPictureLinks.push(picturelink[j].href);
        }
        // -------------------------------------------------------------------------------

    }

    // ----------Photo画像処理用---------------------------------------------------------------------
    // 画像URLをIDに変換
    //.mapを使って新たなarrayを作る。
    const ids = downloadPictureLinks.map(downloadPictureLinks => {
        //スラッシュ、\wはa-z、A-Z、0-9、または_にマッチするように設定し、それらをIDとして保存。
        const match = downloadPictureLinks.match(/ID=([-\w/]+)/);
        return match ? match[1] : null;
    });

    //console.log(ids);

    async function getAllImages() {
        let pageIndex = 0;
        var url = "";
        const allImages = [];

        for(var i=0; i < ids.length; i++){
            pageIndex = 0
            const imagesForThisId = []; // このidの画像を保持するための配列

            while (true) {
                //const url = `https://lovepop.net/r18/monthly/item.php?P=${pageIndex}&ID=g0027471`;
                //url = lovepopPhotoURL + pageIndex + '&ID=' + ids[0];
                url = lovepopPhotoURL + `${pageIndex}&ID=` + ids[i];
                //console.log("url: " + url);
                const images = await getImagesFromPage(url); // このページから画像を取得

                if (images.length === 0) {
                    break; // 画像がないならループを終了
                }

                imagesForThisId.push(...images);
                //console.log(allImages);
                pageIndex++;
            }
            allImages.push(imagesForThisId); // このidの画像全てをallImagesに追加
        }
        return allImages;
    }

    async function getImagesFromPage(url) {
        // ここでページから画像URLを取得するロジック
        // fetchとDOM解析が必要

        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const aTags = doc.querySelectorAll('a[data-lightbox="subscription-item"]'); // data-lightbox属性が"subscription-item"のa要素をすべて取得
        const imageUrls = [];

        for (const aTag of aTags) {
            const href = aTag.href; // href属性を取得
            if (href && href.endsWith('.jpg')) { // URLが存在し、.jpgで終わるものだけ取得
                imageUrls.push(href);
            }
        }

        return imageUrls;
    }
    // -------------------------------------------------------------------------------
    //画像URL情報を取得
    photoImages = getAllImages()
    // -------------------------------------------------------------------------------
}

async function AfterMain(){

    //画像URL情報を全て取得した後のものを代入
    const awaitedPhotoImages = await photoImages;
    //console.log('全ての画像:', awaitedPhotoImages);

    // -------------------------------------------------------------------------------
    // 画像をダウンロードする関数
    async function downloadImage(url) {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                onload: function(response) {
                    const blobUrl = URL.createObjectURL(response.response);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = url.split('/').pop();
                    link.click();
                    resolve();
                }
            });
        });
    }

    // 画像をダウンロードする関数（フォルダーごと）
    async function downloadImageEachFolder(url, folderName) {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                onload: function(response) {
                    const blobUrl = URL.createObjectURL(response.response);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = folderName + '/' + url.split('/').pop();
                    link.click();
                    resolve();
                }
            });
        });
    }

    // 動画をダウンロードする関数
    async function downloadVideo(url, videoName) {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                onload: function(response) {
                    const blobUrl = URL.createObjectURL(response.response);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = videoName + '.mp4';
                    link.click();
                    resolve();
                }
            });
        })
    }

    // -------------------------------------------------------------------------------
    async function getImageAsBlob(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response.response);
                    } else {
                        console.error('Error while fetching image: ', response.statusText);
                        reject(new Error('Error while fetching image: ', response.statusText));
                    }
                },
                onerror: function(error) {
                    console.error('Error occurred while fetching image: ', error);
                    reject(new Error('Error occurred while fetching image: ', error));
                }
            });
        });
    }

    //一度に複数の画像を指定の数、同時に取得する非同期処理
    async function getImagesInChunks(urls, chunkSize) {
        let blobs = [];
        for (let i = 0; i < urls.length; i += chunkSize) {
            const chunkUrls = urls.slice(i, i + chunkSize);
            let chunkBlobs = await Promise.all(chunkUrls.map(url => getImageAsBlob(url)));
            blobs.push(...chunkBlobs);
        }
        return blobs;
    }
    // JSZipの読み込み
    async function downloadImagesAsZip(images,chunkSize, folderName) {
       let zip = new JSZip();
        //console.log(images);

        // 全ての画像をBlob形式で取得する
        let imageBlobs = await getImagesInChunks(images, chunkSize); // chunkSizeとして5を指定

        //各Blobをzipファイルに追加する
        for (let i = 0; i < imageBlobs.length; i++) {
            //console.log(`Blob ${i}: `, imageBlobs[i]);
            zip.file(folderName + '/' + images[i].split('/').pop(), imageBlobs[i]);
        }
        zip.generateAsync({type:"blob"}).then(function(content) {
            let url = URL.createObjectURL(content);
            let a = document.createElement('a');
            a.href = url;
            a.download = folderName + '.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }).catch(function(error) {
            console.log(error);
        });

    }
    // -------------------------------------------------------------------------------

    //----------------------画像のダウンロード管理------------------------------------------------------------------------------
    //二次元配列を使用しての手法
    //まず最初に、配列の"最初"の数でループする。二次元配列が[[1, 2, 3], [4, 5, 6], [7, 8, 9]]だとすると、array2D.lengthは「3」になる。
    console.log("画像のダウンロードを開始...");
    for(let i = 0; i < awaitedPhotoImages.length; i++) {
        const innerArrayImages = awaitedPhotoImages[i];  // [1]や[2]の画像群
        const name = videoNames[i + 1];     // 対応する名前（"学生服"や"メイド服"）
        await downloadImagesAsZip(innerArrayImages, 5, name);
        console.log(name + ': 画像のダウンロード完了！');
    }
          //----------------------動画のダウンロード管理------------------------------------------------------------------------------
    console.log("動画のダウンロードを開始...");
    for(let i=0; i < downloadMovieLinks.length; i++){
       await downloadVideo(downloadMovieLinks[i], videoNames[i]);
        console.log(videoNames[i] + ': 動画のダウンロード完了！');
    }

    //デバッグ
    //console.log(videoNames);
    //console.log(downloadMovieLinks);
    //console.log(downloadPictureLinks);
}
// -------------------------------------------------------------------------------
var elements = document.getElementsByClassName('l--subscription-image-and-movie-list-group');
var btn = document.createElement("button");
btn.innerHTML = "動画と画像をダウンロード";
btn.onclick = () => {
    alert("ダウンロードを開始します！");
    main().then(AfterMain); // mainが完了したらaftermainを実行
}

elements[0].parentNode.insertBefore(btn, elements[0]); // ボタンを各要素の最後に追加
})();