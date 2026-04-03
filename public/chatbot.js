(function () {

  const scriptTag = document.currentScript ||
    document.querySelector('script[data-config]');

  let config = {};

  try {
    config = JSON.parse(scriptTag.getAttribute('data-config') || '{}');
  } catch (e) {
    return;
  }

  const {
    backendUrl = '',
    store      = '',
    botName    = 'ShopBot'
  } = config;

  if (!backendUrl || !store) return;

  const btn = document.createElement('button');
  btn.innerHTML = '💬';
  btn.style = "position:fixed;bottom:20px;right:20px;padding:10px;z-index:9999";

  const box = document.createElement('div');
  box.style = "position:fixed;bottom:70px;right:20px;width:300px;height:400px;background:#111;color:#fff;display:none;padding:10px;overflow:auto";

  document.body.appendChild(btn);
  document.body.appendChild(box);

  btn.onclick = () => {
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  };

  const input = document.createElement('input');
  input.placeholder = "Type message...";
  input.style = "width:80%";

  const send = document.createElement('button');
  send.innerText = "Send";

  box.appendChild(input);
  box.appendChild(send);

  send.onclick = async () => {
    const msg = input.value;
    box.innerHTML += `<div>You: ${msg}</div>`;

    const res = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        shopifyStore: store,
        shopifyToken: config.token,
        claudeKey: config.claude
      })
    });

    const data = await res.json();
    box.innerHTML += `<div>${botName}: ${data.reply}</div>`;
  };

})();
