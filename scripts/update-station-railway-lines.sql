-- 駅の路線情報を更新するSQLスクリプト
-- 生成日時: 2025-10-03T06:06:12.321Z

UPDATE stations
SET railway_lines = '{"JR山手線","JR中央線","JR京浜東北線","東京メトロ丸ノ内線"}'::text[],
    line_orders = '{"JR山手線":1,"JR中央線":1,"JR京浜東北線":13,"東京メトロ丸ノ内線":9}'::jsonb
WHERE name = '東京駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線","東京メトロ有楽町線"}'::text[],
    line_orders = '{"JR山手線":2,"JR京浜東北線":14,"東京メトロ有楽町線":17}'::jsonb
WHERE name = '有楽町駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線","東京メトロ銀座線","都営浅草線","ゆりかもめ"}'::text[],
    line_orders = '{"JR山手線":3,"JR京浜東北線":15,"東京メトロ銀座線":12,"都営浅草線":10,"ゆりかもめ":1}'::jsonb
WHERE name = '新橋駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線"}'::text[],
    line_orders = '{"JR山手線":4,"JR京浜東北線":16}'::jsonb
WHERE name = '浜松町駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線"}'::text[],
    line_orders = '{"JR山手線":5,"JR京浜東北線":17}'::jsonb
WHERE name = '田町駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線"}'::text[],
    line_orders = '{"JR山手線":6,"JR京浜東北線":18}'::jsonb
WHERE name = '高輪ゲートウェイ駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線","京急本線"}'::text[],
    line_orders = '{"JR山手線":7,"JR京浜東北線":19,"京急本線":1}'::jsonb
WHERE name = '品川駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR埼京線","りんかい線"}'::text[],
    line_orders = '{"JR山手線":8,"JR埼京線":8,"りんかい線":8}'::jsonb
WHERE name = '大崎駅';

UPDATE stations
SET railway_lines = '{"JR山手線","都営浅草線","東急池上線"}'::text[],
    line_orders = '{"JR山手線":9,"都営浅草線":5,"東急池上線":1}'::jsonb
WHERE name = '五反田駅';

UPDATE stations
SET railway_lines = '{"JR山手線","東京メトロ南北線","都営三田線","東急目黒線"}'::text[],
    line_orders = '{"JR山手線":10,"東京メトロ南北線":1,"都営三田線":1,"東急目黒線":1}'::jsonb
WHERE name = '目黒駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR埼京線","東京メトロ日比谷線"}'::text[],
    line_orders = '{"JR山手線":11,"JR埼京線":7,"東京メトロ日比谷線":21}'::jsonb
WHERE name = '恵比寿駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR埼京線","東京メトロ銀座線","東京メトロ半蔵門線","東京メトロ副都心線","京王井の頭線","東急東横線","東急田園都市線"}'::text[],
    line_orders = '{"JR山手線":12,"JR埼京線":6,"東京メトロ銀座線":19,"東京メトロ半蔵門線":1,"東京メトロ副都心線":15,"京王井の頭線":1,"東急東横線":1,"東急田園都市線":1}'::jsonb
WHERE name = '渋谷駅';

UPDATE stations
SET railway_lines = '{"JR山手線"}'::text[],
    line_orders = '{"JR山手線":13}'::jsonb
WHERE name = '原宿駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR中央線","JR中央・総武線各駅停車","都営大江戸線"}'::text[],
    line_orders = '{"JR山手線":14,"JR中央線":7,"JR中央・総武線各駅停車":17,"都営大江戸線":26}'::jsonb
WHERE name = '代々木駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR中央線","JR中央・総武線各駅停車","JR埼京線","東京メトロ丸ノ内線","都営新宿線","都営大江戸線","京王線","小田急小田原線"}'::text[],
    line_orders = '{"JR山手線":15,"JR中央線":8,"JR中央・総武線各駅停車":18,"JR埼京線":5,"東京メトロ丸ノ内線":18,"都営新宿線":1,"都営大江戸線":27,"京王線":1,"小田急小田原線":1}'::jsonb
WHERE name = '新宿駅';

UPDATE stations
SET railway_lines = '{"JR山手線"}'::text[],
    line_orders = '{"JR山手線":16}'::jsonb
WHERE name = '新大久保駅';

UPDATE stations
SET railway_lines = '{"JR山手線","東京メトロ東西線","西武新宿線"}'::text[],
    line_orders = '{"JR山手線":17,"東京メトロ東西線":3,"西武新宿線":2}'::jsonb
WHERE name = '高田馬場駅';

UPDATE stations
SET railway_lines = '{"JR山手線"}'::text[],
    line_orders = '{"JR山手線":18}'::jsonb
WHERE name = '目白駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR埼京線","東京メトロ丸ノ内線","東京メトロ有楽町線","東京メトロ副都心線","西武池袋線","東武東上線"}'::text[],
    line_orders = '{"JR山手線":19,"JR埼京線":4,"東京メトロ丸ノ内線":1,"東京メトロ有楽町線":8,"東京メトロ副都心線":8,"西武池袋線":1,"東武東上線":1}'::jsonb
WHERE name = '池袋駅';

UPDATE stations
SET railway_lines = '{"JR山手線"}'::text[],
    line_orders = '{"JR山手線":20}'::jsonb
WHERE name = '大塚駅';

UPDATE stations
SET railway_lines = '{"JR山手線","都営三田線"}'::text[],
    line_orders = '{"JR山手線":21,"都営三田線":15}'::jsonb
WHERE name = '巣鴨駅';

UPDATE stations
SET railway_lines = '{"JR山手線","東京メトロ南北線"}'::text[],
    line_orders = '{"JR山手線":22,"東京メトロ南北線":14}'::jsonb
WHERE name = '駒込駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線"}'::text[],
    line_orders = '{"JR山手線":23,"JR京浜東北線":5}'::jsonb
WHERE name = '田端駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線","東京メトロ千代田線"}'::text[],
    line_orders = '{"JR山手線":24,"JR京浜東北線":6,"東京メトロ千代田線":16}'::jsonb
WHERE name = '西日暮里駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線"}'::text[],
    line_orders = '{"JR山手線":25,"JR京浜東北線":7}'::jsonb
WHERE name = '日暮里駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線"}'::text[],
    line_orders = '{"JR山手線":26,"JR京浜東北線":8}'::jsonb
WHERE name = '鶯谷駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線","東京メトロ銀座線","東京メトロ日比谷線"}'::text[],
    line_orders = '{"JR山手線":27,"JR京浜東北線":9,"東京メトロ銀座線":4,"東京メトロ日比谷線":5}'::jsonb
WHERE name = '上野駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR京浜東北線"}'::text[],
    line_orders = '{"JR山手線":28,"JR京浜東北線":10}'::jsonb
WHERE name = '御徒町駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR中央・総武線各駅停車","JR京浜東北線","東京メトロ日比谷線","つくばエクスプレス"}'::text[],
    line_orders = '{"JR山手線":29,"JR中央・総武線各駅停車":9,"JR京浜東北線":11,"東京メトロ日比谷線":7,"つくばエクスプレス":1}'::jsonb
WHERE name = '秋葉原駅';

UPDATE stations
SET railway_lines = '{"JR山手線","JR中央線","JR京浜東北線","東京メトロ銀座線"}'::text[],
    line_orders = '{"JR山手線":30,"JR中央線":2,"JR京浜東北線":12,"東京メトロ銀座線":7}'::jsonb
WHERE name = '神田駅';

UPDATE stations
SET railway_lines = '{"JR中央線","JR中央・総武線各駅停車","東京メトロ丸ノ内線"}'::text[],
    line_orders = '{"JR中央線":3,"JR中央・総武線各駅停車":10,"東京メトロ丸ノ内線":6}'::jsonb
WHERE name = '御茶ノ水駅';

UPDATE stations
SET railway_lines = '{"JR中央線","JR中央・総武線各駅停車","東京メトロ丸ノ内線","東京メトロ南北線"}'::text[],
    line_orders = '{"JR中央線":4,"JR中央・総武線各駅停車":14,"東京メトロ丸ノ内線":14,"東京メトロ南北線":8}'::jsonb
WHERE name = '四ツ谷駅';

UPDATE stations
SET railway_lines = '{"JR中央線","JR中央・総武線各駅停車"}'::text[],
    line_orders = '{"JR中央線":5,"JR中央・総武線各駅停車":15}'::jsonb
WHERE name = '信濃町駅';

UPDATE stations
SET railway_lines = '{"JR中央線","JR中央・総武線各駅停車"}'::text[],
    line_orders = '{"JR中央線":6,"JR中央・総武線各駅停車":16}'::jsonb
WHERE name = '千駄ケ谷駅';

UPDATE stations
SET railway_lines = '{"JR中央線","JR中央・総武線各駅停車"}'::text[],
    line_orders = '{"JR中央線":9,"JR中央・総武線各駅停車":19}'::jsonb
WHERE name = '大久保駅';

UPDATE stations
SET railway_lines = '{"JR中央線","JR中央・総武線各駅停車","都営大江戸線"}'::text[],
    line_orders = '{"JR中央線":10,"JR中央・総武線各駅停車":20,"都営大江戸線":31}'::jsonb
WHERE name = '東中野駅';

UPDATE stations
SET railway_lines = '{"JR中央線","JR中央・総武線各駅停車","東京メトロ東西線"}'::text[],
    line_orders = '{"JR中央線":11,"JR中央・総武線各駅停車":21,"東京メトロ東西線":1}'::jsonb
WHERE name = '中野駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車","東京メトロ半蔵門線"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":1,"東京メトロ半蔵門線":13}'::jsonb
WHERE name = '錦糸町駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":2}'::jsonb
WHERE name = '亀戸駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":3}'::jsonb
WHERE name = '平井駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":4}'::jsonb
WHERE name = '新小岩駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":5}'::jsonb
WHERE name = '小岩駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":6}'::jsonb
WHERE name = '市川駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車","都営大江戸線"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":7,"都営大江戸線":12}'::jsonb
WHERE name = '両国駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車","都営浅草線"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":8,"都営浅草線":16}'::jsonb
WHERE name = '浅草橋駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車","都営三田線"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":11,"都営三田線":11}'::jsonb
WHERE name = '水道橋駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車","東京メトロ東西線","東京メトロ有楽町線","東京メトロ南北線","都営大江戸線"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":12,"東京メトロ東西線":6,"東京メトロ有楽町線":12,"東京メトロ南北線":10,"都営大江戸線":6}'::jsonb
WHERE name = '飯田橋駅';

UPDATE stations
SET railway_lines = '{"JR中央・総武線各駅停車","東京メトロ有楽町線","東京メトロ南北線","都営新宿線"}'::text[],
    line_orders = '{"JR中央・総武線各駅停車":13,"東京メトロ有楽町線":13,"東京メトロ南北線":9,"都営新宿線":4}'::jsonb
WHERE name = '市ケ谷駅';

UPDATE stations
SET railway_lines = '{"JR京浜東北線","JR埼京線"}'::text[],
    line_orders = '{"JR京浜東北線":1,"JR埼京線":1}'::jsonb
WHERE name = '赤羽駅';

UPDATE stations
SET railway_lines = '{"JR京浜東北線"}'::text[],
    line_orders = '{"JR京浜東北線":2}'::jsonb
WHERE name = '東十条駅';

UPDATE stations
SET railway_lines = '{"JR京浜東北線","東京メトロ南北線"}'::text[],
    line_orders = '{"JR京浜東北線":3,"東京メトロ南北線":16}'::jsonb
WHERE name = '王子駅';

UPDATE stations
SET railway_lines = '{"JR京浜東北線"}'::text[],
    line_orders = '{"JR京浜東北線":4}'::jsonb
WHERE name = '上中里駅';

UPDATE stations
SET railway_lines = '{"JR京浜東北線","東急大井町線","りんかい線"}'::text[],
    line_orders = '{"JR京浜東北線":20,"東急大井町線":1,"りんかい線":7}'::jsonb
WHERE name = '大井町駅';

UPDATE stations
SET railway_lines = '{"JR京浜東北線"}'::text[],
    line_orders = '{"JR京浜東北線":21}'::jsonb
WHERE name = '大森駅';

UPDATE stations
SET railway_lines = '{"JR京浜東北線"}'::text[],
    line_orders = '{"JR京浜東北線":22}'::jsonb
WHERE name = '蒲田駅';

UPDATE stations
SET railway_lines = '{"JR埼京線"}'::text[],
    line_orders = '{"JR埼京線":2}'::jsonb
WHERE name = '十条駅';

UPDATE stations
SET railway_lines = '{"JR埼京線"}'::text[],
    line_orders = '{"JR埼京線":3}'::jsonb
WHERE name = '板橋駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線","都営浅草線","東武スカイツリーライン","つくばエクスプレス"}'::text[],
    line_orders = '{"東京メトロ銀座線":1,"都営浅草線":18,"東武スカイツリーライン":1,"つくばエクスプレス":3}'::jsonb
WHERE name = '浅草駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線"}'::text[],
    line_orders = '{"東京メトロ銀座線":2}'::jsonb
WHERE name = '田原町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線"}'::text[],
    line_orders = '{"東京メトロ銀座線":3}'::jsonb
WHERE name = '稲荷町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線"}'::text[],
    line_orders = '{"東京メトロ銀座線":5}'::jsonb
WHERE name = '上野広小路駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線"}'::text[],
    line_orders = '{"東京メトロ銀座線":6}'::jsonb
WHERE name = '末広町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線","東京メトロ半蔵門線"}'::text[],
    line_orders = '{"東京メトロ銀座線":8,"東京メトロ半蔵門線":9}'::jsonb
WHERE name = '三越前駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線","東京メトロ東西線","都営浅草線"}'::text[],
    line_orders = '{"東京メトロ銀座線":9,"東京メトロ東西線":10,"都営浅草線":13}'::jsonb
WHERE name = '日本橋駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線"}'::text[],
    line_orders = '{"東京メトロ銀座線":10}'::jsonb
WHERE name = '京橋駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線","東京メトロ丸ノ内線","東京メトロ日比谷線"}'::text[],
    line_orders = '{"東京メトロ銀座線":11,"東京メトロ丸ノ内線":10,"東京メトロ日比谷線":14}'::jsonb
WHERE name = '銀座駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線"}'::text[],
    line_orders = '{"東京メトロ銀座線":13}'::jsonb
WHERE name = '虎ノ門駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線","東京メトロ南北線"}'::text[],
    line_orders = '{"東京メトロ銀座線":14,"東京メトロ南北線":6}'::jsonb
WHERE name = '溜池山王駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線","東京メトロ丸ノ内線"}'::text[],
    line_orders = '{"東京メトロ銀座線":15,"東京メトロ丸ノ内線":13}'::jsonb
WHERE name = '赤坂見附駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線","東京メトロ半蔵門線","都営大江戸線"}'::text[],
    line_orders = '{"東京メトロ銀座線":16,"東京メトロ半蔵門線":3,"都営大江戸線":24}'::jsonb
WHERE name = '青山一丁目駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線"}'::text[],
    line_orders = '{"東京メトロ銀座線":17}'::jsonb
WHERE name = '外苑前駅';

UPDATE stations
SET railway_lines = '{"東京メトロ銀座線","東京メトロ千代田線","東京メトロ半蔵門線"}'::text[],
    line_orders = '{"東京メトロ銀座線":18,"東京メトロ千代田線":4,"東京メトロ半蔵門線":2}'::jsonb
WHERE name = '表参道駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":2}'::jsonb
WHERE name = '新大塚駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":3}'::jsonb
WHERE name = '茗荷谷駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線","東京メトロ南北線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":4,"東京メトロ南北線":11}'::jsonb
WHERE name = '後楽園駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線","都営大江戸線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":5,"都営大江戸線":8}'::jsonb
WHERE name = '本郷三丁目駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":7}'::jsonb
WHERE name = '淡路町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線","東京メトロ東西線","東京メトロ千代田線","東京メトロ半蔵門線","都営三田線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":8,"東京メトロ東西線":9,"東京メトロ千代田線":11,"東京メトロ半蔵門線":8,"都営三田線":9}'::jsonb
WHERE name = '大手町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線","東京メトロ日比谷線","東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":11,"東京メトロ日比谷線":16,"東京メトロ千代田線":8}'::jsonb
WHERE name = '霞ケ関駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線","東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":12,"東京メトロ千代田線":7}'::jsonb
WHERE name = '国会議事堂前駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":15}'::jsonb
WHERE name = '四谷三丁目駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":16}'::jsonb
WHERE name = '新宿御苑前駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線","東京メトロ副都心線","都営新宿線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":17,"東京メトロ副都心線":12,"都営新宿線":2}'::jsonb
WHERE name = '新宿三丁目駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":19}'::jsonb
WHERE name = '西新宿駅';

UPDATE stations
SET railway_lines = '{"東京メトロ丸ノ内線","都営大江戸線"}'::text[],
    line_orders = '{"東京メトロ丸ノ内線":20,"都営大江戸線":30}'::jsonb
WHERE name = '中野坂上駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線","東京メトロ千代田線","東武スカイツリーライン","つくばエクスプレス"}'::text[],
    line_orders = '{"東京メトロ日比谷線":1,"東京メトロ千代田線":18,"東武スカイツリーライン":9,"つくばエクスプレス":5}'::jsonb
WHERE name = '北千住駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線","つくばエクスプレス"}'::text[],
    line_orders = '{"東京メトロ日比谷線":2,"つくばエクスプレス":4}'::jsonb
WHERE name = '南千住駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":3}'::jsonb
WHERE name = '三ノ輪駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":4}'::jsonb
WHERE name = '入谷駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":6}'::jsonb
WHERE name = '仲御徒町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":8}'::jsonb
WHERE name = '小伝馬町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線","都営浅草線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":9,"都営浅草線":14}'::jsonb
WHERE name = '人形町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線","東京メトロ東西線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":10,"東京メトロ東西線":11}'::jsonb
WHERE name = '茅場町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":11}'::jsonb
WHERE name = '八丁堀駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":12}'::jsonb
WHERE name = '築地駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線","都営浅草線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":13,"都営浅草線":11}'::jsonb
WHERE name = '東銀座駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線","東京メトロ千代田線","都営三田線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":15,"東京メトロ千代田線":9,"都営三田線":8}'::jsonb
WHERE name = '日比谷駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":17}'::jsonb
WHERE name = '虎ノ門ヒルズ駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":18}'::jsonb
WHERE name = '神谷町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線","都営大江戸線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":19,"都営大江戸線":23}'::jsonb
WHERE name = '六本木駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":20}'::jsonb
WHERE name = '広尾駅';

UPDATE stations
SET railway_lines = '{"東京メトロ日比谷線","東急東横線"}'::text[],
    line_orders = '{"東京メトロ日比谷線":22,"東急東横線":3}'::jsonb
WHERE name = '中目黒駅';

UPDATE stations
SET railway_lines = '{"東京メトロ東西線"}'::text[],
    line_orders = '{"東京メトロ東西線":2}'::jsonb
WHERE name = '落合駅';

UPDATE stations
SET railway_lines = '{"東京メトロ東西線"}'::text[],
    line_orders = '{"東京メトロ東西線":4}'::jsonb
WHERE name = '早稲田駅';

UPDATE stations
SET railway_lines = '{"東京メトロ東西線"}'::text[],
    line_orders = '{"東京メトロ東西線":5}'::jsonb
WHERE name = '神楽坂駅';

UPDATE stations
SET railway_lines = '{"東京メトロ東西線","東京メトロ半蔵門線","都営新宿線"}'::text[],
    line_orders = '{"東京メトロ東西線":7,"東京メトロ半蔵門線":6,"都営新宿線":5}'::jsonb
WHERE name = '九段下駅';

UPDATE stations
SET railway_lines = '{"東京メトロ東西線"}'::text[],
    line_orders = '{"東京メトロ東西線":8}'::jsonb
WHERE name = '竹橋駅';

UPDATE stations
SET railway_lines = '{"東京メトロ東西線","都営大江戸線"}'::text[],
    line_orders = '{"東京メトロ東西線":12,"都営大江戸線":15}'::jsonb
WHERE name = '門前仲町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ東西線"}'::text[],
    line_orders = '{"東京メトロ東西線":13}'::jsonb
WHERE name = '木場駅';

UPDATE stations
SET railway_lines = '{"東京メトロ東西線"}'::text[],
    line_orders = '{"東京メトロ東西線":14}'::jsonb
WHERE name = '東陽町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ東西線"}'::text[],
    line_orders = '{"東京メトロ東西線":15}'::jsonb
WHERE name = '南砂町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線","小田急小田原線"}'::text[],
    line_orders = '{"東京メトロ千代田線":1,"小田急小田原線":5}'::jsonb
WHERE name = '代々木上原駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ千代田線":2}'::jsonb
WHERE name = '代々木公園駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線","東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ千代田線":3,"東京メトロ副都心線":14}'::jsonb
WHERE name = '明治神宮前駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ千代田線":5}'::jsonb
WHERE name = '乃木坂駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ千代田線":6}'::jsonb
WHERE name = '赤坂駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ千代田線":10}'::jsonb
WHERE name = '二重橋前駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ千代田線":12}'::jsonb
WHERE name = '新御茶ノ水駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ千代田線":13}'::jsonb
WHERE name = '湯島駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ千代田線":14}'::jsonb
WHERE name = '根津駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ千代田線":15}'::jsonb
WHERE name = '千駄木駅';

UPDATE stations
SET railway_lines = '{"東京メトロ千代田線"}'::text[],
    line_orders = '{"東京メトロ千代田線":17}'::jsonb
WHERE name = '町屋駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":1,"東京メトロ副都心線":1}'::jsonb
WHERE name = '地下鉄成増駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":2,"東京メトロ副都心線":2}'::jsonb
WHERE name = '地下鉄赤塚駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":3,"東京メトロ副都心線":3}'::jsonb
WHERE name = '平和台駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":4,"東京メトロ副都心線":4}'::jsonb
WHERE name = '氷川台駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":5,"東京メトロ副都心線":5}'::jsonb
WHERE name = '小竹向原駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":6,"東京メトロ副都心線":6}'::jsonb
WHERE name = '千川駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":7,"東京メトロ副都心線":7}'::jsonb
WHERE name = '要町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":9}'::jsonb
WHERE name = '東池袋駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":10}'::jsonb
WHERE name = '護国寺駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":11}'::jsonb
WHERE name = '江戸川橋駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":14}'::jsonb
WHERE name = '麹町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","東京メトロ半蔵門線","東京メトロ南北線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":15,"東京メトロ半蔵門線":4,"東京メトロ南北線":7}'::jsonb
WHERE name = '永田町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":16}'::jsonb
WHERE name = '桜田門駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":18}'::jsonb
WHERE name = '銀座一丁目駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":19}'::jsonb
WHERE name = '新富町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","都営大江戸線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":20,"都営大江戸線":16}'::jsonb
WHERE name = '月島駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","ゆりかもめ"}'::text[],
    line_orders = '{"東京メトロ有楽町線":21,"ゆりかもめ":16}'::jsonb
WHERE name = '豊洲駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":22}'::jsonb
WHERE name = '辰巳駅';

UPDATE stations
SET railway_lines = '{"東京メトロ有楽町線","りんかい線"}'::text[],
    line_orders = '{"東京メトロ有楽町線":23,"りんかい線":1}'::jsonb
WHERE name = '新木場駅';

UPDATE stations
SET railway_lines = '{"東京メトロ半蔵門線"}'::text[],
    line_orders = '{"東京メトロ半蔵門線":5}'::jsonb
WHERE name = '半蔵門駅';

UPDATE stations
SET railway_lines = '{"東京メトロ半蔵門線","都営三田線","都営新宿線"}'::text[],
    line_orders = '{"東京メトロ半蔵門線":7,"都営三田線":10,"都営新宿線":6}'::jsonb
WHERE name = '神保町駅';

UPDATE stations
SET railway_lines = '{"東京メトロ半蔵門線"}'::text[],
    line_orders = '{"東京メトロ半蔵門線":10}'::jsonb
WHERE name = '水天宮前駅';

UPDATE stations
SET railway_lines = '{"東京メトロ半蔵門線","都営大江戸線"}'::text[],
    line_orders = '{"東京メトロ半蔵門線":11,"都営大江戸線":14}'::jsonb
WHERE name = '清澄白河駅';

UPDATE stations
SET railway_lines = '{"東京メトロ半蔵門線","都営新宿線"}'::text[],
    line_orders = '{"東京メトロ半蔵門線":12,"都営新宿線":13}'::jsonb
WHERE name = '住吉駅';

UPDATE stations
SET railway_lines = '{"東京メトロ半蔵門線","都営浅草線","東武スカイツリーライン"}'::text[],
    line_orders = '{"東京メトロ半蔵門線":14,"都営浅草線":20,"東武スカイツリーライン":3}'::jsonb
WHERE name = '押上駅';

UPDATE stations
SET railway_lines = '{"東京メトロ南北線","都営三田線"}'::text[],
    line_orders = '{"東京メトロ南北線":2,"都営三田線":2}'::jsonb
WHERE name = '白金台駅';

UPDATE stations
SET railway_lines = '{"東京メトロ南北線","都営三田線"}'::text[],
    line_orders = '{"東京メトロ南北線":3,"都営三田線":3}'::jsonb
WHERE name = '白金高輪駅';

UPDATE stations
SET railway_lines = '{"東京メトロ南北線","都営大江戸線"}'::text[],
    line_orders = '{"東京メトロ南北線":4,"都営大江戸線":22}'::jsonb
WHERE name = '麻布十番駅';

UPDATE stations
SET railway_lines = '{"東京メトロ南北線"}'::text[],
    line_orders = '{"東京メトロ南北線":5}'::jsonb
WHERE name = '六本木一丁目駅';

UPDATE stations
SET railway_lines = '{"東京メトロ南北線"}'::text[],
    line_orders = '{"東京メトロ南北線":12}'::jsonb
WHERE name = '東大前駅';

UPDATE stations
SET railway_lines = '{"東京メトロ南北線"}'::text[],
    line_orders = '{"東京メトロ南北線":13}'::jsonb
WHERE name = '本駒込駅';

UPDATE stations
SET railway_lines = '{"東京メトロ南北線"}'::text[],
    line_orders = '{"東京メトロ南北線":15}'::jsonb
WHERE name = '西ケ原駅';

UPDATE stations
SET railway_lines = '{"東京メトロ南北線"}'::text[],
    line_orders = '{"東京メトロ南北線":17}'::jsonb
WHERE name = '王子神谷駅';

UPDATE stations
SET railway_lines = '{"東京メトロ南北線"}'::text[],
    line_orders = '{"東京メトロ南北線":18}'::jsonb
WHERE name = '志茂駅';

UPDATE stations
SET railway_lines = '{"東京メトロ南北線"}'::text[],
    line_orders = '{"東京メトロ南北線":19}'::jsonb
WHERE name = '赤羽岩淵駅';

UPDATE stations
SET railway_lines = '{"東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ副都心線":9}'::jsonb
WHERE name = '雑司が谷駅';

UPDATE stations
SET railway_lines = '{"東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ副都心線":10}'::jsonb
WHERE name = '西早稲田駅';

UPDATE stations
SET railway_lines = '{"東京メトロ副都心線","都営大江戸線"}'::text[],
    line_orders = '{"東京メトロ副都心線":11,"都営大江戸線":2}'::jsonb
WHERE name = '東新宿駅';

UPDATE stations
SET railway_lines = '{"東京メトロ副都心線"}'::text[],
    line_orders = '{"東京メトロ副都心線":13}'::jsonb
WHERE name = '北参道駅';

UPDATE stations
SET railway_lines = '{"都営浅草線"}'::text[],
    line_orders = '{"都営浅草線":1}'::jsonb
WHERE name = '西馬込駅';

UPDATE stations
SET railway_lines = '{"都営浅草線"}'::text[],
    line_orders = '{"都営浅草線":2}'::jsonb
WHERE name = '馬込駅';

UPDATE stations
SET railway_lines = '{"都営浅草線","東急大井町線"}'::text[],
    line_orders = '{"都営浅草線":3,"東急大井町線":4}'::jsonb
WHERE name = '中延駅';

UPDATE stations
SET railway_lines = '{"都営浅草線"}'::text[],
    line_orders = '{"都営浅草線":4}'::jsonb
WHERE name = '戸越駅';

UPDATE stations
SET railway_lines = '{"都営浅草線"}'::text[],
    line_orders = '{"都営浅草線":6}'::jsonb
WHERE name = '高輪台駅';

UPDATE stations
SET railway_lines = '{"都営浅草線"}'::text[],
    line_orders = '{"都営浅草線":7}'::jsonb
WHERE name = '泉岳寺駅';

UPDATE stations
SET railway_lines = '{"都営浅草線","都営三田線"}'::text[],
    line_orders = '{"都営浅草線":8,"都営三田線":4}'::jsonb
WHERE name = '三田駅';

UPDATE stations
SET railway_lines = '{"都営浅草線","都営大江戸線"}'::text[],
    line_orders = '{"都営浅草線":9,"都営大江戸線":20}'::jsonb
WHERE name = '大門駅';

UPDATE stations
SET railway_lines = '{"都営浅草線"}'::text[],
    line_orders = '{"都営浅草線":12}'::jsonb
WHERE name = '宝町駅';

UPDATE stations
SET railway_lines = '{"都営浅草線"}'::text[],
    line_orders = '{"都営浅草線":15}'::jsonb
WHERE name = '東日本橋駅';

UPDATE stations
SET railway_lines = '{"都営浅草線","都営大江戸線"}'::text[],
    line_orders = '{"都営浅草線":17,"都営大江戸線":11}'::jsonb
WHERE name = '蔵前駅';

UPDATE stations
SET railway_lines = '{"都営浅草線"}'::text[],
    line_orders = '{"都営浅草線":19}'::jsonb
WHERE name = '本所吾妻橋駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":5}'::jsonb
WHERE name = '芝公園駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":6}'::jsonb
WHERE name = '御成門駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":7}'::jsonb
WHERE name = '内幸町駅';

UPDATE stations
SET railway_lines = '{"都営三田線","都営大江戸線"}'::text[],
    line_orders = '{"都営三田線":12,"都営大江戸線":7}'::jsonb
WHERE name = '春日駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":13}'::jsonb
WHERE name = '白山駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":14}'::jsonb
WHERE name = '千石駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":16}'::jsonb
WHERE name = '西巣鴨駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":17}'::jsonb
WHERE name = '新板橋駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":18}'::jsonb
WHERE name = '板橋区役所前駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":19}'::jsonb
WHERE name = '板橋本町駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":20}'::jsonb
WHERE name = '本蓮沼駅';

UPDATE stations
SET railway_lines = '{"都営三田線"}'::text[],
    line_orders = '{"都営三田線":21}'::jsonb
WHERE name = '志村坂上駅';

UPDATE stations
SET railway_lines = '{"都営新宿線"}'::text[],
    line_orders = '{"都営新宿線":3}'::jsonb
WHERE name = '曙橋駅';

UPDATE stations
SET railway_lines = '{"都営新宿線"}'::text[],
    line_orders = '{"都営新宿線":7}'::jsonb
WHERE name = '小川町駅';

UPDATE stations
SET railway_lines = '{"都営新宿線"}'::text[],
    line_orders = '{"都営新宿線":8}'::jsonb
WHERE name = '岩本町駅';

UPDATE stations
SET railway_lines = '{"都営新宿線"}'::text[],
    line_orders = '{"都営新宿線":9}'::jsonb
WHERE name = '馬喰横山駅';

UPDATE stations
SET railway_lines = '{"都営新宿線"}'::text[],
    line_orders = '{"都営新宿線":10}'::jsonb
WHERE name = '浜町駅';

UPDATE stations
SET railway_lines = '{"都営新宿線","都営大江戸線"}'::text[],
    line_orders = '{"都営新宿線":11,"都営大江戸線":13}'::jsonb
WHERE name = '森下駅';

UPDATE stations
SET railway_lines = '{"都営新宿線"}'::text[],
    line_orders = '{"都営新宿線":12}'::jsonb
WHERE name = '菊川駅';

UPDATE stations
SET railway_lines = '{"都営新宿線"}'::text[],
    line_orders = '{"都営新宿線":14}'::jsonb
WHERE name = '西大島駅';

UPDATE stations
SET railway_lines = '{"都営新宿線"}'::text[],
    line_orders = '{"都営新宿線":15}'::jsonb
WHERE name = '大島駅';

UPDATE stations
SET railway_lines = '{"都営新宿線"}'::text[],
    line_orders = '{"都営新宿線":16}'::jsonb
WHERE name = '東大島駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":1}'::jsonb
WHERE name = '新宿西口駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":3}'::jsonb
WHERE name = '若松河田駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":4}'::jsonb
WHERE name = '牛込柳町駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":5}'::jsonb
WHERE name = '牛込神楽坂駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":9}'::jsonb
WHERE name = '上野御徒町駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線","つくばエクスプレス"}'::text[],
    line_orders = '{"都営大江戸線":10,"つくばエクスプレス":2}'::jsonb
WHERE name = '新御徒町駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":17}'::jsonb
WHERE name = '勝どき駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":18}'::jsonb
WHERE name = '築地市場駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線","ゆりかもめ"}'::text[],
    line_orders = '{"都営大江戸線":19,"ゆりかもめ":2}'::jsonb
WHERE name = '汐留駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":21}'::jsonb
WHERE name = '赤羽橋駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":25}'::jsonb
WHERE name = '国立競技場駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":28}'::jsonb
WHERE name = '都庁前駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":29}'::jsonb
WHERE name = '西新宿五丁目駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線","西武新宿線"}'::text[],
    line_orders = '{"都営大江戸線":32,"西武新宿線":4}'::jsonb
WHERE name = '中井駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":33}'::jsonb
WHERE name = '落合南長崎駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":34}'::jsonb
WHERE name = '新江古田駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線","西武池袋線"}'::text[],
    line_orders = '{"都営大江戸線":35,"西武池袋線":6}'::jsonb
WHERE name = '練馬駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":36}'::jsonb
WHERE name = '豊島園駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":37}'::jsonb
WHERE name = '練馬春日町駅';

UPDATE stations
SET railway_lines = '{"都営大江戸線"}'::text[],
    line_orders = '{"都営大江戸線":38}'::jsonb
WHERE name = '光が丘駅';

UPDATE stations
SET railway_lines = '{"京王線"}'::text[],
    line_orders = '{"京王線":2}'::jsonb
WHERE name = '笹塚駅';

UPDATE stations
SET railway_lines = '{"京王線"}'::text[],
    line_orders = '{"京王線":3}'::jsonb
WHERE name = '代田橋駅';

UPDATE stations
SET railway_lines = '{"京王線","京王井の頭線"}'::text[],
    line_orders = '{"京王線":4,"京王井の頭線":8}'::jsonb
WHERE name = '明大前駅';

UPDATE stations
SET railway_lines = '{"京王線"}'::text[],
    line_orders = '{"京王線":5}'::jsonb
WHERE name = '下高井戸駅';

UPDATE stations
SET railway_lines = '{"京王線"}'::text[],
    line_orders = '{"京王線":6}'::jsonb
WHERE name = '桜上水駅';

UPDATE stations
SET railway_lines = '{"京王線"}'::text[],
    line_orders = '{"京王線":7}'::jsonb
WHERE name = '上北沢駅';

UPDATE stations
SET railway_lines = '{"京王線"}'::text[],
    line_orders = '{"京王線":8}'::jsonb
WHERE name = '八幡山駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線"}'::text[],
    line_orders = '{"京王井の頭線":2}'::jsonb
WHERE name = '神泉駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線"}'::text[],
    line_orders = '{"京王井の頭線":3}'::jsonb
WHERE name = '駒場東大前駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線"}'::text[],
    line_orders = '{"京王井の頭線":4}'::jsonb
WHERE name = '池ノ上駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線","小田急小田原線"}'::text[],
    line_orders = '{"京王井の頭線":5,"小田急小田原線":7}'::jsonb
WHERE name = '下北沢駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線"}'::text[],
    line_orders = '{"京王井の頭線":6}'::jsonb
WHERE name = '新代田駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線"}'::text[],
    line_orders = '{"京王井の頭線":7}'::jsonb
WHERE name = '東松原駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線"}'::text[],
    line_orders = '{"京王井の頭線":9}'::jsonb
WHERE name = '永福町駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線"}'::text[],
    line_orders = '{"京王井の頭線":10}'::jsonb
WHERE name = '西永福駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線"}'::text[],
    line_orders = '{"京王井の頭線":11}'::jsonb
WHERE name = '浜田山駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線"}'::text[],
    line_orders = '{"京王井の頭線":12}'::jsonb
WHERE name = '高井戸駅';

UPDATE stations
SET railway_lines = '{"京王井の頭線"}'::text[],
    line_orders = '{"京王井の頭線":13}'::jsonb
WHERE name = '富士見ヶ丘駅';

UPDATE stations
SET railway_lines = '{"小田急小田原線"}'::text[],
    line_orders = '{"小田急小田原線":2}'::jsonb
WHERE name = '南新宿駅';

UPDATE stations
SET railway_lines = '{"小田急小田原線"}'::text[],
    line_orders = '{"小田急小田原線":3}'::jsonb
WHERE name = '参宮橋駅';

UPDATE stations
SET railway_lines = '{"小田急小田原線"}'::text[],
    line_orders = '{"小田急小田原線":4}'::jsonb
WHERE name = '代々木八幡駅';

UPDATE stations
SET railway_lines = '{"小田急小田原線"}'::text[],
    line_orders = '{"小田急小田原線":6}'::jsonb
WHERE name = '東北沢駅';

UPDATE stations
SET railway_lines = '{"小田急小田原線"}'::text[],
    line_orders = '{"小田急小田原線":8}'::jsonb
WHERE name = '世田谷代田駅';

UPDATE stations
SET railway_lines = '{"小田急小田原線"}'::text[],
    line_orders = '{"小田急小田原線":9}'::jsonb
WHERE name = '梅ヶ丘駅';

UPDATE stations
SET railway_lines = '{"小田急小田原線"}'::text[],
    line_orders = '{"小田急小田原線":10}'::jsonb
WHERE name = '豪徳寺駅';

UPDATE stations
SET railway_lines = '{"小田急小田原線"}'::text[],
    line_orders = '{"小田急小田原線":11}'::jsonb
WHERE name = '経堂駅';

UPDATE stations
SET railway_lines = '{"小田急小田原線"}'::text[],
    line_orders = '{"小田急小田原線":12}'::jsonb
WHERE name = '千歳船橋駅';

UPDATE stations
SET railway_lines = '{"小田急小田原線"}'::text[],
    line_orders = '{"小田急小田原線":13}'::jsonb
WHERE name = '祖師ヶ谷大蔵駅';

UPDATE stations
SET railway_lines = '{"東急東横線"}'::text[],
    line_orders = '{"東急東横線":2}'::jsonb
WHERE name = '代官山駅';

UPDATE stations
SET railway_lines = '{"東急東横線"}'::text[],
    line_orders = '{"東急東横線":4}'::jsonb
WHERE name = '祐天寺駅';

UPDATE stations
SET railway_lines = '{"東急東横線"}'::text[],
    line_orders = '{"東急東横線":5}'::jsonb
WHERE name = '学芸大学駅';

UPDATE stations
SET railway_lines = '{"東急東横線"}'::text[],
    line_orders = '{"東急東横線":6}'::jsonb
WHERE name = '都立大学駅';

UPDATE stations
SET railway_lines = '{"東急東横線","東急大井町線"}'::text[],
    line_orders = '{"東急東横線":7,"東急大井町線":10}'::jsonb
WHERE name = '自由が丘駅';

UPDATE stations
SET railway_lines = '{"東急東横線","東急目黒線"}'::text[],
    line_orders = '{"東急東横線":8,"東急目黒線":8}'::jsonb
WHERE name = '田園調布駅';

UPDATE stations
SET railway_lines = '{"東急東横線","東急目黒線"}'::text[],
    line_orders = '{"東急東横線":9,"東急目黒線":9}'::jsonb
WHERE name = '多摩川駅';

UPDATE stations
SET railway_lines = '{"東急田園都市線"}'::text[],
    line_orders = '{"東急田園都市線":2}'::jsonb
WHERE name = '池尻大橋駅';

UPDATE stations
SET railway_lines = '{"東急田園都市線"}'::text[],
    line_orders = '{"東急田園都市線":3}'::jsonb
WHERE name = '三軒茶屋駅';

UPDATE stations
SET railway_lines = '{"東急田園都市線"}'::text[],
    line_orders = '{"東急田園都市線":4}'::jsonb
WHERE name = '駒沢大学駅';

UPDATE stations
SET railway_lines = '{"東急田園都市線"}'::text[],
    line_orders = '{"東急田園都市線":5}'::jsonb
WHERE name = '桜新町駅';

UPDATE stations
SET railway_lines = '{"東急田園都市線"}'::text[],
    line_orders = '{"東急田園都市線":6}'::jsonb
WHERE name = '用賀駅';

UPDATE stations
SET railway_lines = '{"東急田園都市線","東急大井町線"}'::text[],
    line_orders = '{"東急田園都市線":7,"東急大井町線":15}'::jsonb
WHERE name = '二子玉川駅';

UPDATE stations
SET railway_lines = '{"東急目黒線"}'::text[],
    line_orders = '{"東急目黒線":2}'::jsonb
WHERE name = '不動前駅';

UPDATE stations
SET railway_lines = '{"東急目黒線"}'::text[],
    line_orders = '{"東急目黒線":3}'::jsonb
WHERE name = '武蔵小山駅';

UPDATE stations
SET railway_lines = '{"東急目黒線"}'::text[],
    line_orders = '{"東急目黒線":4}'::jsonb
WHERE name = '西小山駅';

UPDATE stations
SET railway_lines = '{"東急目黒線"}'::text[],
    line_orders = '{"東急目黒線":5}'::jsonb
WHERE name = '洗足駅';

UPDATE stations
SET railway_lines = '{"東急目黒線","東急大井町線"}'::text[],
    line_orders = '{"東急目黒線":6,"東急大井町線":8}'::jsonb
WHERE name = '大岡山駅';

UPDATE stations
SET railway_lines = '{"東急目黒線"}'::text[],
    line_orders = '{"東急目黒線":7}'::jsonb
WHERE name = '奥沢駅';

UPDATE stations
SET railway_lines = '{"東急大井町線"}'::text[],
    line_orders = '{"東急大井町線":2}'::jsonb
WHERE name = '下神明駅';

UPDATE stations
SET railway_lines = '{"東急大井町線"}'::text[],
    line_orders = '{"東急大井町線":3}'::jsonb
WHERE name = '戸越公園駅';

UPDATE stations
SET railway_lines = '{"東急大井町線"}'::text[],
    line_orders = '{"東急大井町線":5}'::jsonb
WHERE name = '荏原町駅';

UPDATE stations
SET railway_lines = '{"東急大井町線","東急池上線"}'::text[],
    line_orders = '{"東急大井町線":6,"東急池上線":5}'::jsonb
WHERE name = '旗の台駅';

UPDATE stations
SET railway_lines = '{"東急大井町線"}'::text[],
    line_orders = '{"東急大井町線":7}'::jsonb
WHERE name = '北千束駅';

UPDATE stations
SET railway_lines = '{"東急大井町線"}'::text[],
    line_orders = '{"東急大井町線":9}'::jsonb
WHERE name = '緑が丘駅';

UPDATE stations
SET railway_lines = '{"東急大井町線"}'::text[],
    line_orders = '{"東急大井町線":11}'::jsonb
WHERE name = '九品仏駅';

UPDATE stations
SET railway_lines = '{"東急大井町線"}'::text[],
    line_orders = '{"東急大井町線":12}'::jsonb
WHERE name = '尾山台駅';

UPDATE stations
SET railway_lines = '{"東急大井町線"}'::text[],
    line_orders = '{"東急大井町線":13}'::jsonb
WHERE name = '等々力駅';

UPDATE stations
SET railway_lines = '{"東急大井町線"}'::text[],
    line_orders = '{"東急大井町線":14}'::jsonb
WHERE name = '上野毛駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":2}'::jsonb
WHERE name = '大崎広小路駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":3}'::jsonb
WHERE name = '戸越銀座駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":4}'::jsonb
WHERE name = '荏原中延駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":6}'::jsonb
WHERE name = '長原駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":7}'::jsonb
WHERE name = '洗足池駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":8}'::jsonb
WHERE name = '石川台駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":9}'::jsonb
WHERE name = '雪が谷大塚駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":10}'::jsonb
WHERE name = '御嶽山駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":11}'::jsonb
WHERE name = '久が原駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":12}'::jsonb
WHERE name = '千鳥町駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":13}'::jsonb
WHERE name = '池上駅';

UPDATE stations
SET railway_lines = '{"東急池上線"}'::text[],
    line_orders = '{"東急池上線":14}'::jsonb
WHERE name = '蓮沼駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":2}'::jsonb
WHERE name = '北品川駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":3}'::jsonb
WHERE name = '新馬場駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":4}'::jsonb
WHERE name = '青物横丁駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":5}'::jsonb
WHERE name = '鮫洲駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":6}'::jsonb
WHERE name = '立会川駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":7}'::jsonb
WHERE name = '大森海岸駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":8}'::jsonb
WHERE name = '平和島駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":9}'::jsonb
WHERE name = '大森町駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":10}'::jsonb
WHERE name = '梅屋敷駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":11}'::jsonb
WHERE name = '京急蒲田駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":12}'::jsonb
WHERE name = '雑色駅';

UPDATE stations
SET railway_lines = '{"京急本線"}'::text[],
    line_orders = '{"京急本線":13}'::jsonb
WHERE name = '六郷土手駅';

UPDATE stations
SET railway_lines = '{"西武新宿線"}'::text[],
    line_orders = '{"西武新宿線":1}'::jsonb
WHERE name = '西武新宿駅';

UPDATE stations
SET railway_lines = '{"西武新宿線"}'::text[],
    line_orders = '{"西武新宿線":3}'::jsonb
WHERE name = '下落合駅';

UPDATE stations
SET railway_lines = '{"西武新宿線"}'::text[],
    line_orders = '{"西武新宿線":5}'::jsonb
WHERE name = '新井薬師前駅';

UPDATE stations
SET railway_lines = '{"西武新宿線"}'::text[],
    line_orders = '{"西武新宿線":6}'::jsonb
WHERE name = '沼袋駅';

UPDATE stations
SET railway_lines = '{"西武新宿線"}'::text[],
    line_orders = '{"西武新宿線":7}'::jsonb
WHERE name = '野方駅';

UPDATE stations
SET railway_lines = '{"西武新宿線"}'::text[],
    line_orders = '{"西武新宿線":8}'::jsonb
WHERE name = '都立家政駅';

UPDATE stations
SET railway_lines = '{"西武池袋線"}'::text[],
    line_orders = '{"西武池袋線":2}'::jsonb
WHERE name = '椎名町駅';

UPDATE stations
SET railway_lines = '{"西武池袋線"}'::text[],
    line_orders = '{"西武池袋線":3}'::jsonb
WHERE name = '東長崎駅';

UPDATE stations
SET railway_lines = '{"西武池袋線"}'::text[],
    line_orders = '{"西武池袋線":4}'::jsonb
WHERE name = '江古田駅';

UPDATE stations
SET railway_lines = '{"西武池袋線"}'::text[],
    line_orders = '{"西武池袋線":5}'::jsonb
WHERE name = '桜台駅';

UPDATE stations
SET railway_lines = '{"西武池袋線"}'::text[],
    line_orders = '{"西武池袋線":7}'::jsonb
WHERE name = '中村橋駅';

UPDATE stations
SET railway_lines = '{"西武池袋線"}'::text[],
    line_orders = '{"西武池袋線":8}'::jsonb
WHERE name = '富士見台駅';

UPDATE stations
SET railway_lines = '{"東武東上線"}'::text[],
    line_orders = '{"東武東上線":2}'::jsonb
WHERE name = '北池袋駅';

UPDATE stations
SET railway_lines = '{"東武東上線"}'::text[],
    line_orders = '{"東武東上線":3}'::jsonb
WHERE name = '下板橋駅';

UPDATE stations
SET railway_lines = '{"東武東上線"}'::text[],
    line_orders = '{"東武東上線":4}'::jsonb
WHERE name = '大山駅';

UPDATE stations
SET railway_lines = '{"東武東上線"}'::text[],
    line_orders = '{"東武東上線":5}'::jsonb
WHERE name = '中板橋駅';

UPDATE stations
SET railway_lines = '{"東武東上線"}'::text[],
    line_orders = '{"東武東上線":6}'::jsonb
WHERE name = 'ときわ台駅';

UPDATE stations
SET railway_lines = '{"東武東上線"}'::text[],
    line_orders = '{"東武東上線":7}'::jsonb
WHERE name = '上板橋駅';

UPDATE stations
SET railway_lines = '{"東武スカイツリーライン"}'::text[],
    line_orders = '{"東武スカイツリーライン":2}'::jsonb
WHERE name = 'とうきょうスカイツリー駅';

UPDATE stations
SET railway_lines = '{"東武スカイツリーライン"}'::text[],
    line_orders = '{"東武スカイツリーライン":4}'::jsonb
WHERE name = '曳舟駅';

UPDATE stations
SET railway_lines = '{"東武スカイツリーライン"}'::text[],
    line_orders = '{"東武スカイツリーライン":5}'::jsonb
WHERE name = '東向島駅';

UPDATE stations
SET railway_lines = '{"東武スカイツリーライン"}'::text[],
    line_orders = '{"東武スカイツリーライン":6}'::jsonb
WHERE name = '鐘ヶ淵駅';

UPDATE stations
SET railway_lines = '{"東武スカイツリーライン"}'::text[],
    line_orders = '{"東武スカイツリーライン":7}'::jsonb
WHERE name = '堀切駅';

UPDATE stations
SET railway_lines = '{"東武スカイツリーライン"}'::text[],
    line_orders = '{"東武スカイツリーライン":8}'::jsonb
WHERE name = '牛田駅';

UPDATE stations
SET railway_lines = '{"りんかい線"}'::text[],
    line_orders = '{"りんかい線":2}'::jsonb
WHERE name = '東雲駅';

UPDATE stations
SET railway_lines = '{"りんかい線"}'::text[],
    line_orders = '{"りんかい線":3}'::jsonb
WHERE name = '国際展示場駅';

UPDATE stations
SET railway_lines = '{"りんかい線"}'::text[],
    line_orders = '{"りんかい線":4}'::jsonb
WHERE name = '東京テレポート駅';

UPDATE stations
SET railway_lines = '{"りんかい線","東京モノレール"}'::text[],
    line_orders = '{"りんかい線":5,"東京モノレール":2}'::jsonb
WHERE name = '天王洲アイル駅';

UPDATE stations
SET railway_lines = '{"りんかい線"}'::text[],
    line_orders = '{"りんかい線":6}'::jsonb
WHERE name = '品川シーサイド駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":3}'::jsonb
WHERE name = '竹芝駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":4}'::jsonb
WHERE name = '日の出駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":5}'::jsonb
WHERE name = '芝浦ふ頭駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":6}'::jsonb
WHERE name = 'お台場海浜公園駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":7}'::jsonb
WHERE name = '台場駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":8}'::jsonb
WHERE name = '東京国際クルーズターミナル駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":9}'::jsonb
WHERE name = 'テレコムセンター駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":10}'::jsonb
WHERE name = '青海駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":11}'::jsonb
WHERE name = '東京ビッグサイト駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":12}'::jsonb
WHERE name = '有明駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":13}'::jsonb
WHERE name = '有明テニスの森駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":14}'::jsonb
WHERE name = '市場前駅';

UPDATE stations
SET railway_lines = '{"ゆりかもめ"}'::text[],
    line_orders = '{"ゆりかもめ":15}'::jsonb
WHERE name = '新豊洲駅';

UPDATE stations
SET railway_lines = '{"東京モノレール"}'::text[],
    line_orders = '{"東京モノレール":1}'::jsonb
WHERE name = 'モノレール浜松町駅';

UPDATE stations
SET railway_lines = '{"東京モノレール"}'::text[],
    line_orders = '{"東京モノレール":3}'::jsonb
WHERE name = '大井競馬場前駅';

UPDATE stations
SET railway_lines = '{"東京モノレール"}'::text[],
    line_orders = '{"東京モノレール":4}'::jsonb
WHERE name = '流通センター駅';

UPDATE stations
SET railway_lines = '{"東京モノレール"}'::text[],
    line_orders = '{"東京モノレール":5}'::jsonb
WHERE name = '昭和島駅';

UPDATE stations
SET railway_lines = '{"つくばエクスプレス"}'::text[],
    line_orders = '{"つくばエクスプレス":6}'::jsonb
WHERE name = '青井駅';

UPDATE stations
SET railway_lines = '{"つくばエクスプレス"}'::text[],
    line_orders = '{"つくばエクスプレス":7}'::jsonb
WHERE name = '六町駅';
