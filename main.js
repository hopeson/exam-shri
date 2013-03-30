
$(function() {

    var dfd = $.Deferred(),
        alb_photo,
        images = {},
        last_loaded_img,
        $thumbs_height  = 90,
        $body = $('body'),
        $small = $('.small'),
        $prev_arr = $('a.prev'),
        $next_arr = $('a.next');

    dfd.resolve();


    dfd
        //используя Яндкс.Фотки API отправляем запрос на коллекции пользователя "aig1001"
        .then(function () {
            return $.get("http://api-fotki.yandex.ru/api/users/aig1001/?format=json", {}, function (data) {
                alb_photo = data['collections']['album-list']['href'];
            }, 'jsonp');

        })
        //запрос на коллекции альбомов
        .pipe(function () {
            return $.get(alb_photo + "/?format=json", {}, function (data) {
                alb_photo = data['links']['self'];
            }, 'jsonp');

        })
        //запрос на коллекцию картинок альбома 'Кошкин дом'
        .pipe(function () {
            return $.get(alb_photo, {}, function (data) {
                var a;
                jQuery.each(data['entries'], function () {
                    if (this['title'] == 'Кошкин дом') return a = this;
                });
                alb_photo = a['links']['photos'];
            }, 'jsonp');

        })

        //запрос на фотографии альбома, записываем в значение свойств объекта ссылки на картинки

        .pipe(function () {
            return $.get(alb_photo, {}, function (data) {
                jQuery.each(data['entries'].slice(0, data['entries'].length-1), function (i) {
                    i++;
                    $(images).data(''+i, { XXS: this['img']['XXS']['href'], L: this['img']['L']['href']});
                });

            //записываем дату обновления последней загруженной картинки, чтобы с нее начать подгрузку остальных
                var last_loaded = data['entries'].length-1;
                last_loaded_img = data['entries'][last_loaded]['updated'];
            }, 'jsonp');

        //заполняем панель превью фотографий

        }).pipe(function () {
             jQuery.each($(images).data(), function (i) {
                var path = this.XXS;
                $small.append('<a href="/"><img src="'+ path +'" alt="' + i +'" height="75" width="75"></a>');
            });

        //показываем последнюю активную фотографию с помощью history API
            var first_img,img_num;
            if (history.state){
                first_img = history.state.img;
                img_num = history.state.img_num;
            }else{
                first_img = $(images).data('1').L;
                img_num = 1;
            }

            checkLastElem(img_num);
            changeCurrentThumb($('.small img[alt="'+ img_num +'"]'));
            return $('.current_img').html('<img src="'+ first_img +'" alt="'+ img_num +'">');
        });



    $small.hide();

    //при клике на превью листаем фото в право или в лево, в зависимости от положения предыдущей фотографии
    $small.on('click', 'a', function (event) {
        event.preventDefault();
        var this_img = $(this).find('img'),
            img_num = $(this_img).attr("alt"),
            old_num = $('.current_img img').attr("alt");

        changeCurrentThumb($(this_img));

        if(parseInt(img_num, 10) > parseInt(old_num, 10)){
            nextImg(img_num);
        }else{
            prevImg(img_num);
        }
    });

    //отображение предыдущей фотографии
    $prev_arr.on('click', function (event) {
        event.preventDefault();

        var curr_img = $('.current_img').find('img').attr("alt"),
            prev_num = parseInt(curr_img, 10) - 1 + '',
            prev_thumb = $small.find('img[alt="'+prev_num+'"]');

        changeCurrentThumb($(prev_thumb));

        prevImg(prev_num);
    });

    //отображение следующей фотографии
    $next_arr.on('click', function (event) {
        event.preventDefault();

        var curr_img = $('.current_img').find('img').attr("alt"),
            next_num = parseInt(curr_img, 10) + 1 + '',
            next_thumb = $small.find('img[alt="'+next_num+'"]');

        changeCurrentThumb($(next_thumb));

        nextImg(next_num);
    });

    //если колесо мышки скролится вверх, то двигаем панель превью влево, если скролл вниз, то двигаем вправо
    $small.bind('mousewheel DOMMouseScroll', function(e) {
        var scrollTo = null;
        if (e.type == 'mousewheel') {
            scrollTo = e.originalEvent.wheelDelta;
        }
        else if (e.type == 'DOMMouseScroll') {
            scrollTo = e.originalEvent.detail;
        }
        var $body_width = $body.width();
        if (scrollTo > 0) {
            e.preventDefault();
            $small.animate({
                left: parseInt($small.css('left'), 10) <= ($body_width +$body_width/2) - $small.width() ?
                    $body_width - $small.width() :
                    '-='+$body_width/2
            }, {queue:false});
        }else{
            e.preventDefault();
                $small.animate({
                    left: parseInt($small.css('left'), 10) >= -$body_width/2 ?
                        0 :
                        '+='+$body_width/2
                }, {queue:false});
        }
    });

    //показываем, скрываем стрелки(справа, слева)
    $(document).mouseenter(function() {
        $('.wrapp > a').show();
    });
    $(document).mouseleave(function() {
        $('.wrapp > a').hide();
    });

    //показываем, скрываем панель превью при приблежении курсора к области панели
    $(document).mousemove(function(e) {
        var distance = $body.height() - $thumbs_height;
        if (e.pageY > distance){
            $small.slideDown();
        }else{
            $small.slideUp();
        }
    });

    //центрируем активное изображение при наведении на панель превью
    $small.mouseenter(function() {
        centerCurrent($('.active'))
    });

    //масштабируем картинку при изменении размера окна
    $(window).resize(function() {
        imgSize($(".current_img"));
    });

    //маштабирование картинки
    function imgSize(img) {
        if($body.height() <= img.find('img').height()){
            img.height( $body.height());
        }
        if ($body.height() > img.find('img').height()){
            img.height('auto');
        }
        if ($body.width() > img.find('img').width()){
            img.width('auto');
        }
        if ($body.width() <= img.find('img').width()){
            img.width( $body.width());
        }
    }

    //отображаем предыдущую картинку, сохраняем ее с помощью history api
    function prevImg(elem_num) {
        $('.prev_img').html('<img src="'+ $(images).data(elem_num).L +'" alt="'+ elem_num +'">')
                      .find('img').promise().done(slideRight());
        history.pushState({img: $(images).data(elem_num).L, img_num: elem_num}, '', '');
        checkLastElem(elem_num);
    }

    //отображаем следующую картинку, сохраняем ее с помощью history api
    function nextImg(elem_num) {
        $('.next_img').html('<img src="'+ $(images).data(elem_num).L +'" alt="'+ elem_num +'">')
                      .find('img').promise().done(slideLeft());
        history.pushState({img: $(images).data(elem_num).L, img_num: elem_num}, '', '');
        checkLastElem(elem_num);
    }

    //проверка - является ли картинка последней или первой
    function checkLastElem(elem_num) {
        if(elem_num == getKeysCount($(images).data())){
            $next_arr.css({visibility:'hidden'});
            loadRestImg();
        }else if(elem_num == 1){
            $prev_arr.css({visibility:'hidden'});
        }else{
            $('a.prev, a.next').css({visibility:'visible'});
        }
    }

    //подгрузка следующих картинок из текущего альбома, начиная с последней загруженной
    function loadRestImg() {
        var link_photo = alb_photo.substring(0, alb_photo.indexOf('?'));

        $.get(link_photo+'updated;'+last_loaded_img+'/?format=json', {}, function (data) {
            var i = getKeysCount($(images).data());

            jQuery.each(data['entries'].slice(0, data['entries'].length-1), function () {
                i++;
                $(images).data(''+i, { XXS: this['img']['XXS']['href'], L: this['img']['L']['href']});
                var path = this['img']['XXS']['href'];
                $small.append('<a href="/"><img src="'+ path +'" alt="' + i +'" height="75" width="75"></a>');
            });

            //отобразить стрелки если элемент не последний
            if (data['entries'].length > 1) $next_arr.css({visibility:'visible'});

            //записываем дату обновления последней загруженной картинки
            var last_loaded = data['entries'].length-1;
            return last_loaded_img = data['entries'][last_loaded]['updated'];
        }, 'jsonp');
    }

    //подсчет количества свойств в объекте
    function getKeysCount(obj) {
        var counter = 0;
        for (var key in obj) {
            counter++;
        }
        return counter;
    }

    //анимация смены картики влево
    function slideLeft() {

        $('.current_img').animate({
            left: -($('.current_img').outerWidth()*2)
        }, {
            "complete" : function() {
                $(this).remove();
            }
            });
        $('.next_img').animate({
            right: 0
        });
        $('.next_img').removeClass().addClass('current_img');
        $('.main ul').append('<li class="next_img"></li>');
        imgSize($('.current_img'));
    }

    //анимация смены картинки вправо
    function slideRight() {
        $('.current_img').animate({
            left: $('.current_img').outerWidth()*2
        }, {
            "complete" : function() {
                $(this).remove();
            }
        });
        $('.prev_img').animate({
            left: 0
        });
        $('.prev_img').removeClass().addClass('current_img');
        $('.main ul').append('<li class="prev_img"></li>');
        imgSize($('.current_img'));
    }

    //добавление класса 'active' текущей превью
    function changeCurrentThumb(current) {
        $('.small img').removeClass('active');
        $(current).addClass('active');
        centerCurrent(current);
    }

    //центрирование текущей превью
    function centerCurrent(current) {
        var $body_width = $body.width(),
            $small_width = $small.width(),
            $curr_offset = $(current).offset().left;
        if($curr_offset > ($body_width/2)){
            $small.animate({
                left: parseInt($small.css('left'), 10) <= ($body_width+$body_width/2) - $small_width ?
                    $body_width - $small_width :
                    '-='+($curr_offset - $body_width/2 +$(current).width())
            }, {queue:false});
        }else{
            $small.animate({
                left: parseInt($small.css('left'), 10) >= -$body_width/2 ?
                    0 :
                    '+='+($body_width/2 - $curr_offset-$(current).width())
            }, {queue:false});
        }
    }

});
