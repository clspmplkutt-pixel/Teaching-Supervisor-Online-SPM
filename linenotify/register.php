<?php

define('CLIENT_ID','PriZbys8lhY2VUH83J0EME');
define('LINE_API_URI','https://notify-bot.line.me/oauth/authorize?');
define('CALLBACK_URI','https://psn2.sys4school.com/linenotify/callback_root.php');

$queryString = [
    'response_type'=> 'code',
    'client_id'=> CLIENT_ID,
    'redirect_uri'=> CALLBACK_URI,
    'scope'=> 'notify',
    'state'=> '3670800508318'
];

$queryString = LINE_API_URI . http_build_query($queryString);

// echo $queryString;
?>
    <a href="<?php echo $queryString; ?>">Register</a>