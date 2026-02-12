<?php

define('CLIENT_ID', LINE_NOTIFY_CLIEND_ID);
define('CLIENT_SECRET', LINE_NOTIFY_CLIEND_ID_SECRET);
define('LINE_API_URI', 'https://notify-bot.line.me/oauth/token');
define('CALLBACK_URI', LINE_NOTIFY_CALLBACK_URI);

parse_str($_SERVER['QUERY_STRING'], $queries);

$fields = [
    'grant_type' => 'authorization_code',
    'code' => $queries['code'],
    'redirect_uri' => CALLBACK_URI,
    'client_id' => CLIENT_ID,
    'client_secret' => CLIENT_SECRET,
];

try {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, LINE_API_URI);
    curl_setopt($ch, CURLOPT_POST, count($fields));
    curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    curl_close($ch);
    if ($res == false)
        throw new Exception(curl_error($ch), curl_errno($ch));

    $json = json_decode($res, true);
    // print_r($json);
    

    echo $queries['state'] . " ได้รับ Token Line Notify : " .$json['access_token'];

} catch (Exception $e) {
    var_dump($e);
}
