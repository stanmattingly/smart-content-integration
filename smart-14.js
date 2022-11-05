window.addEventListener('load', () => {
    const apiKey = document.querySelector('[data-smart-auth-id]').dataset.smartAuthId;
    const urlParams = new URLSearchParams(window.location.search);
    const smartAddToken = urlParams.get('smart-add-token');

    function isHTML(str) {
        var a = document.createElement('div');
        a.innerHTML = str;

        for (var c = a.childNodes, i = c.length; i--;) {
            if (c[i].nodeType == 1) return true;
        }

        return false;
    }

    function createXPathFromElement(elm) {
        var allNodes = document.getElementsByTagName('*');
        for (var segs = []; elm && elm.nodeType == 1; elm = elm.parentNode) {
            if (elm.hasAttribute('id')) {
                var uniqueIdCount = 0;
                for (var n = 0; n < allNodes.length; n++) {
                    if (allNodes[n].hasAttribute('id') && allNodes[n].id == elm.id) uniqueIdCount++;
                    if (uniqueIdCount > 1) break;
                };
                if (uniqueIdCount == 1) {
                    segs.unshift('id("' + elm.getAttribute('id') + '")');
                    return segs.join('/');
                } else {
                    segs.unshift(elm.localName.toLowerCase() + '[@id="' + elm.getAttribute('id') + '"]');
                }
            } else if (elm.hasAttribute('class')) {
                segs.unshift(elm.localName.toLowerCase() + '[@class="' + elm.getAttribute('class') + '"]');
            } else {
                for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) {
                    if (sib.localName == elm.localName) i++;
                };
                segs.unshift(elm.localName.toLowerCase() + '[' + i + ']');
            };
        };
        return segs.length ? '/' + segs.join('/') : null;
    };

    function getElementByXpath(path) {
        return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    fetch(`https://6767-172-98-142-66.ngrok.io/auth/smart-add-tokens/${smartAddToken}/`, {
        method: "get",
        headers: {
            'Authorization': `Token ${apiKey}`,
        },
    }).then(response => {
        if (response.ok) {
            response.json().then(() => {
                document.addEventListener('mouseover', event => {
                    const element = event.target
                    if (!isHTML(event.target.innerHTML)) {
                        if (!element.dataset.clicked) {
                            element.dataset.originalBorder = element.style.border;
                        }
                        if (!element.dataset.clicked) {
                            element.style.border = "2px solid red";
                        }

                        element.addEventListener('mouseleave', event => {
                            if (!element.dataset.clicked) {
                                element.style.border = element.dataset.originalBorder;
                            }
                        })
                    }
                });

                document.addEventListener('click', event => {
                    const element = event.target
                    if (!isHTML(event.target.innerHTML)) {
                        event.preventDefault();
                        event.stopPropagation();

                        if (!element.dataset.clicked) {
                            element.style.border = "2px solid green";
                            element.dataset.clicked = true;
                            const xpath = createXPathFromElement(element);
                            fetch("https://6767-172-98-142-66.ngrok.io/api/app/components/", {
                                method: "post",
                                headers: {
                                    'Authorization': `Token ${apiKey}`,
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    name: event.target.textContent,
                                    xpath: xpath,
                                })
                            })
                        } else {
                            element.style.border = element.dataset.originalBorder;
                            element.dataset.clicked = "";
                        }
                    }
                });
            })
        } else {
            console.log(response.status)
            const events = [
                'click',
                'focus',
                'mouseover',
            ]

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
                for (let i in events) {
                    element.addEventListener(events[i], (event) => {
                        logAction(element, event.type);
                    })
                }

                if ("smartConversion" in element.dataset) {
                    logAction(element, 'conversion');
                }
            }

            function setElementText(element, text) {
                return new Promise(resolve => {
                    element.textContent = text;
                    const tryCount = 10

                    for (let i = 1; i <= tryCount; i++) {
                        setTimeout(() => {
                            element.textContent = text;
                            if (i === tryCount) {
                                resolve();
                            }
                        }, 100 * i);
                    }
                })
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
                                if (data.text) {
                                    setElementText(element, data.text);
                                }
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
                                if (data.text) {
                                    setElementText(element, data.text);
                                }
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
                            if (data.text) {
                                setElementText(element, data.text);
                            }
                            element.dataset.smartContentId = data.universal_id;
                            addElementListeners(element);
                            contentIds.push(data.universal_id)
                        }).then(() => addClusterContents(clusterId, contentIds))
                    })
                    xpathComponents.forEach(xpathComponent => {
                        const element = xpathComponent.element;
                        fetch(`https://6767-172-98-142-66.ngrok.io/api/app/components/get_smart_content/?id=${encodeURIComponent(xpathComponent.xpath)}&smart_user_id=${localStorage.getItem('smart-user-id')}&cluster_uuid=${clusterId}`, {
                            method: 'get',
                            headers: {
                                'Authorization': `Token ${apiKey}`
                            }
                        }).then(response => response.json()).then(data => {
                            if (data.text) {
                                setElementText(element, data.text);
                            }
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
                        if (component !== null) {
                            xpathComponentList.push({
                                element: component,
                                xpath: xpathComponent.xpath,
                            });
                        }
                        if (index === array.length - 1) resolve();
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
                { subtree: true, childList: true, }
            )
        }
    })
});