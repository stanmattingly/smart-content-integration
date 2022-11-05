function loadSmartness() {
    const apiKey = document.querySelector('[data-smart-auth-id]').dataset.smartAuthId;
    const events = [
        'click',
        'focus',
        'mouseover',
    ]

    function getElementByXpath(path) {
        return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    function logAction(element, eventType) {
        fetch(`https://6767-172-98-142-66.ngrok.io/api/app/analytics/`, {
            method: 'post',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "content_uuid": element.dataset.smartContentId,
                "user_uuid": localStorage.getItem('smart-user-id'),
                "event": eventType,
                "cluster_uuid": sessionStorage.getItem('smart-cluster-id'),
            })
        }).then(response => response.json()).then(result => {
            if (sessionStorage.getItem('smart-cluster-id') !== result.content_cluster.universal_id) {
                sessionStorage.setItem('smart-cluster-id', result.content_cluster.universal_id);
            }
        })
    }

    function addElementListeners(element) {
        for(let i in events) {
            element.addEventListener(events[i], (event) => {
                logAction(element, event.type);
            })
        }

        if ("smartConversion" in element.dataset) {
            logAction(element, 'conversion');
        }
    }

    function processSmartElements(elementList, xpathComponents) {
        let contentIds = [];
        const clusterId = sessionStorage.getItem('smart-cluster-id');
        const userId = localStorage.getItem('smart-user-id');

        if (!clusterId) {
            fetch(`https://6767-172-98-142-66.ngrok.io/api/app/content-clusters/`, {
                method: 'post',
                headers: {
                    'Authorization': `Token ${apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "user_uuid": userId,
                    "url": window.location.href,
                })
            }).then(response => response.json()).then(cluster => {
                sessionStorage.setItem('smart-cluster-id', cluster.universal_id);
                elementList.forEach(element => {
                    fetch(`https://6767-172-98-142-66.ngrok.io/api/app/components/${element.dataset.smartComponentId}/get_smart_content/?smart_user_id=${localStorage.getItem('smart-user-id')}&cluster_uuid=${sessionStorage.getItem('smart-cluster-id')}`, {
                        method: 'get',
                        headers: {
                            'Authorization': `Token ${apiKey}`
                        }
                    }).then(response => response.json()).then(data => {
                        element.textContent = data.text ? data.text : element.textContent;
                        element.dataset.smartContentId = data.universal_id;
                        addElementListeners(element);
                        contentIds.push(data.universal_id)
                    }).then(() => addClusterContents(cluster.universal_id, contentIds, userId))  
                })
                xpathComponents.forEach(xpathComponent => {
                    const element = xpathComponent.element;
                    fetch(`https://6767-172-98-142-66.ngrok.io/api/app/components/get_smart_content/?id=${encodeURIComponent(xpathComponent.xpath)}&smart_user_id=${localStorage.getItem('smart-user-id')}&cluster_uuid=${sessionStorage.getItem('smart-cluster-id')}`, {
                        method: 'get',
                        headers: {
                            'Authorization': `Token ${apiKey}`
                        }
                    }).then(response => response.json()).then(data => {
                        element.textContent = data.text ? data.text : element.textContent;
                        element.dataset.smartContentId = data.universal_id;
                        addElementListeners(element);
                        contentIds.push(data.universal_id)
                    }).then(() => addClusterContents(cluster.universal_id, contentIds, userId))  
                })
            })
        } else {
            elementList.forEach(element => {
                fetch(`https://6767-172-98-142-66.ngrok.io/api/app/components/get_smart_content/?id=${element.dataset.smartComponentId}&smart_user_id=${localStorage.getItem('smart-user-id')}&cluster_uuid=${clusterId}`, {
                    method: 'get',
                    headers: {
                        'Authorization': `Token ${apiKey}`
                    }
                }).then(response => response.json()).then(data => {
                    element.textContent = data.text ? data.text : element.textContent;
                    element.dataset.smartContentId = data.universal_id;
                    addElementListeners(element);
                    contentIds.push(data.universal_id)
                }).then(() => addClusterContents(clusterId, contentIds))  
            })
            xpathComponents.forEach(xpathComponent => {
                console.log(xpathComponent);
                const element = xpathComponent.element;
                fetch(`https://6767-172-98-142-66.ngrok.io/api/app/components/get_smart_content/?id=${encodeURIComponent(xpathComponent.xpath)}&smart_user_id=${localStorage.getItem('smart-user-id')}&cluster_uuid=${clusterId}`, {
                    method: 'get',
                    headers: {
                        'Authorization': `Token ${apiKey}`
                    }
                }).then(response => response.json()).then(data => {
                    console.log(data);
                    element.textContent = data.text ? data.text : element.textContent;
                    element.dataset.smartContentId = data.universal_id;
                    addElementListeners(element);
                    contentIds.push(data.universal_id)
                }).then(() => addClusterContents(clusterId, contentIds, userId))  
            })
        }
    }

    function addClusterContents(clusterId, contents, userId) {
        fetch(`https://6767-172-98-142-66.ngrok.io/api/app/content-clusters/${clusterId}/`, {
            method: 'patch',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "contents": contents,
                "user_uuid": userId,
            })
        })
    }

    fetch('https://6767-172-98-142-66.ngrok.io/api/app/components/get_xpath_components/', {
        method: 'get',
        headers: {
            'Authorization': `Token ${apiKey}`
        }
    }).then(response => response.json()).then(xpathComponents => {
        const smartComponents = document.querySelectorAll('[data-smart-component-id]');
        const xpathComponentList = []

        const buildComponents = new Promise((resolve, reject) => {
            xpathComponents.forEach((xpathComponent, index, array) => {
                const component = getElementByXpath(xpathComponent.xpath);
                console.log(component);
                if (component !== null) {
                    xpathComponentList.push({
                        element: component,
                        xpath: xpathComponent.xpath,
                    });
                }
                if (index === array.length-1) resolve();
            });  
        });

        buildComponents.then(() => {
            if (!localStorage.getItem('smart-user-id')) {
                fetch('https://6767-172-98-142-66.ngrok.io/api/app/analytic-users/', {
                    method: 'post',
                    headers: {
                        'Authorization': `Token ${apiKey}`
                    }
                }).then(response => response.json()).then(user => {
                    localStorage.setItem('smart-user-id', user.universal_id);
                    processSmartElements(smartComponents, xpathComponentList);
                })
            } else {
                processSmartElements(smartComponents, xpathComponentList);
            }
        })
    });

    const observer = new MutationObserver(mutations_list => {
        mutations_list.forEach(mutation => {
            mutation.addedNodes.forEach(addedNode => {
                const dataset = addedNode.dataset ? addedNode.dataset : []
                if ("smartComponentId" in dataset) {
                    processSmartElements([addedNode]);
                }
            })
        })
    });

    observer.observe(
        document.documentElement || document.body,
        {subtree: true, childList: true,}
    )
}

window.addEventListener('load', () => {
    setTimeout(loadSmartness, 500);
});