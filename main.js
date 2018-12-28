const CEP_API_URL = "https://viacep.com.br/ws/"
const JSON_FORMAT = "/json"
const HTTP_STATUS_OK = 200
const GOOGLE_MAPS_GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json?address="
const GOOGLE_API_KEY = "&key=AIzaSyDrM2JAFNh8SiW7pIEnvBcoj6JIEyFWpxo"
const MOCK_API_URL = "http://5c251c85cfdadd0014d14b4b.mockapi.io/api/address"
const currentAddressKey = "currentAddress"

async function getLatitudeAndLongitude(address) {
    const URIAddress = address.logradouro ? 
    `${address.logradouro.replace(/\ /g, "+")},+${address.localidade.replace(/\ /g, "+")}` :
    `${address.localidade.replace(/\ /g, "+")}`

    const response = await fetch(`${GOOGLE_MAPS_GEOCODE_ENDPOINT+URIAddress+GOOGLE_API_KEY}`)
    const coordenates = await response.json()
    return coordenates.results[0].geometry.location
}

async function renderResult(address) {
    const rawAddresses = await fetch(`${MOCK_API_URL}`)
    const addresses = await rawAddresses.json()
    const isNewAddress = addresses.some(a => a.cep.toString().replace(/\-/g, "") == address.cep.toString().replace(/\-/g, ""))

    getLatitudeAndLongitude(address).then(coordenates => {
        address.latitude = coordenates.lat
        address.longitude = coordenates.longitude
        document.querySelector("#addressResult").style.display = "block"
        document.querySelector("#sectionCEP").style.display = "none"

        const addressView = `
        <section>
            <h3>Detalhes do endereço: </h3>
            ${address.logradouro ? `<p>Endereço: ${address.logradouro}</p>` : ''}
            <p>Cidade: ${address.localidade}</p>
            <p>UF: ${address.uf}</p>
            <p>CEP: ${address.cep}</p>
            <p>Latitude: ${coordenates.lat}</p>
            <p>Longitude: ${coordenates.lng}</p>
            ${!isNewAddress ? `<button id="buttonSaveAddress" onclick="saveAddress()" class="mdc-button">Salvar</button>` : ''}
            <button onclick="clean()" class="mdc-button">Voltar</button>
        </section>
        `
        document.querySelector("#addressDetail").innerHTML = addressView

        const map = new google.maps.Map(document.getElementById('map'), {
            center: coordenates,
            zoom: 15
          });

        sessionStorage.setItem(currentAddressKey, JSON.stringify({
            state: address.uf,
            city: address.localidade,
            cep: address.cep,
            address: address.logradouro,
            latitude: coordenates.lat,
            longitude: coordenates.lng,
        }))
    }).catch((error) => {
        alert(`Erro durante o recebimento da latitude e longitude da api do google maps, info: ${error}`)
    })
}

function getCEP(cep) {
    cep = cep.toString().replace(/\-/g, "")

    if (cep.length !== 8) {
        alert("O cep deve conter 8 números!")
        return
    }
    const xmlHttpRequest = new XMLHttpRequest()

    xmlHttpRequest.onreadystatechange = () => {
        if(xmlHttpRequest.readyState == XMLHttpRequest.DONE && xmlHttpRequest.status == HTTP_STATUS_OK) {
            renderResult(JSON.parse(xmlHttpRequest.responseText))
            return
        }
    }

    xmlHttpRequest.open("GET", `${CEP_API_URL+cep+JSON_FORMAT}`)
    xmlHttpRequest.send()
}

function clean() {
    document.querySelector("#textCep").value = ""
    document.querySelector("#addressResult").style.display = "none"
    document.querySelector("#sectionCEP").style.display = "block"
    const showCEPButton = document.querySelector("#showCEP")
    showCEPButton.style.display = "block"
    document.querySelector("#sectionCEP").innerHTML = showCEPButton.outerHTML
    sessionStorage.removeItem(currentAddressKey)
}

async function saveAddress() {
    const address = sessionStorage.getItem(currentAddressKey)

    if(!address) {
        alert('Endereço não encontrado!')
        return
    }

    const rawResponse = await fetch(MOCK_API_URL, {
        method: 'POST',
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: address
    });
    const result = await rawResponse.json();

    sessionStorage.removeItem(currentAddressKey)
    document.querySelector("#buttonSaveAddress").style.display = "none"
    alert(`Endereço do cep: ${result.cep} salvo com sucesso!`);
}

async function showCEPs() {
    const rawAddresses = await fetch(`${MOCK_API_URL}`)
    const addresses = await rawAddresses.json()
    
    const CEPView = `
        <h3>CEPs:</h3>
        <ul>
            ${addresses.map((address) => 
                `<li>
                    <button onclick="getCEP('${address.cep}')" class="mdc-button">${address.cep}</button> 
                    - ${address.address.length > 0 ? `${address.address},`: ''} 
                    ${address.city}, ${address.state} 
                    <button class="mdc-button">Editar</button>
                    <button class="mdc-button">Remover</button>
                </li>`.trim()).join('')
            }
        </ul>
        <button onclick="clean()" class="mdc-button">Voltar</button>
    `
    document.querySelector("#sectionCEP").innerHTML += CEPView
    document.querySelector("#showCEP").style.display = "none"
}

window.addEventListener('load', function() {
    clean()
})