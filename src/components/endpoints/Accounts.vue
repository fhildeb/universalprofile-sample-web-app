<script setup lang="ts">
import Notifications from '@/components/Notification.vue'
import useNotifications from '@/compositions/useNotifications'
import useWalletConnectV2 from '@/compositions/useWalletConnectV2'
import { getState, useState } from '@/stores'
import useWeb3 from '@/compositions/useWeb3'
import { UP_CONNECTED_ADDRESS } from '@/helpers/config'
import { createBlockScoutLink } from '@/utils/createLinks'
import Web3Utils from 'web3-utils'
import { computed, watch, ref } from 'vue'
import { provider as Provider } from 'web3-core'

const { notification, clearNotification, hasNotification, setNotification } =
  useNotifications()
const { setDisconnected, setConnected, recalcTokens } = useState()
const { setupWeb3, requestAccounts } = useWeb3()
const hasExtension = ref<boolean>(!!window.ethereum)

watch(
  () => !!window.ethereum,
  value => (hasExtension.value = value)
)
const { resetWCV2Provider, setupWCV2Provider, openWCV2Modal } =
  useWalletConnectV2()

const hexChainId = computed(() => {
  return Web3Utils.numberToHex(getState('chainId'))
})

const connectExtension = async () => {
  clearNotification()

  if (!window.ethereum) {
    setNotification(
      'window.ethereum is undefined, is the extension enabled?',
      'warning'
    )
    return
  }

  // The Ethereum object is used as a provider
  setupWeb3(window.ethereum as unknown as Provider)

  try {
    const [address] = await requestAccounts()
    setConnected(address, 'browserExtension')
    localStorage.setItem(UP_CONNECTED_ADDRESS, address)
  } catch (error) {
    setNotification((error as unknown as Error).message, 'danger')
  }
}

const connectWalletConnectV2 = async () => {
  clearNotification()

  try {
    await setupWCV2Provider()
    await openWCV2Modal()
    setConnected(getState('address'), 'walletConnectV2')
    setNotification(`Connected to address: ${getState('address')}`, 'info')
  } catch (error) {
    setNotification((error as unknown as Error).message, 'danger')
  }
}

const disconnect = async () => {
  clearNotification()

  if (getState('channel') == 'walletConnectV2') {
    await resetWCV2Provider()
  } else {
    localStorage.removeItem(UP_CONNECTED_ADDRESS)
  }

  setNotification(`Disconnected ${getState('channel')} channel`, 'info')

  setDisconnected()
  await setupWeb3(null)
}
const handleRefresh = (e: Event) => {
  e.stopPropagation()
  recalcTokens()
}
</script>

<template>
  <div class="tile is-4 is-parent">
    <div class="tile is-child box">
      <p class="is-size-5 has-text-weight-bold mb-1">Connect</p>
      <div class="field">
        <button
          class="button is-primary is-rounded mb-1"
          :disabled="!hasExtension || getState('isConnected')"
          data-testid="connect-extension"
          @click="connectExtension"
        >
          Browser Extension
        </button>
        <span
          v-if="
            getState('channel') === 'browserExtension' &&
            getState('isConnected')
          "
          class="icon ml-3 mt-1 has-text-primary"
        >
          <i class="fas fa-check"></i>
        </span>
      </div>
      <div class="field">
        <button
          class="button is-primary is-rounded mb-1"
          :disabled="getState('isConnected')"
          data-testid="connect-wc-v2"
          @click="connectWalletConnectV2"
        >
          Wallet Connect V2
        </button>
        <span
          v-if="
            getState('channel') === 'walletConnectV2' && getState('isConnected')
          "
          class="icon ml-3 mt-4 has-text-primary"
        >
          <i class="fas fa-check"></i>
        </span>
      </div>
      <div class="field">
        <button
          class="button is-primary is-rounded"
          :disabled="!getState('isConnected')"
          data-testid="disconnect"
          @click="disconnect"
        >
          Disconnect
        </button>
      </div>
      <div class="field">
        <Notifications
          v-if="hasNotification"
          :notification="notification"
          class="mt-4"
          @hide="clearNotification"
        >
        </Notifications>
      </div>
      <div class="field">
        <div
          v-if="getState('isConnected')"
          class="notification is-info is-light mt-1"
          data-testid="info"
        >
          <p>Connected to address:</p>
          <p class="text-center">
            <b>
              <a
                :href="createBlockScoutLink(getState('address'))"
                target="_blank"
                class="is-family-code is-size-7"
                >{{ getState('address') }}</a
              >
            </b>
          </p>
          <p class="mb-1">
            Balance: <b class="is-family-code">{{ getState('balance') }} LYX</b>
          </p>
          <p data-testid="chain">
            Chain ID:
            <b class="is-family-code"
              >{{ getState('chainId') }} ({{ hexChainId }})</b
            >
          </p>
          <ul>
            <li v-for="item in getState('lsp7')" :key="item.address + '_lsp7'">
              <p>
                {{ item.balance }} {{ item.symbol }} of {{ item.name }} (LSP7)
              </p>
              <b>
                <p class="text-center">
                  <a
                    :href="createBlockScoutLink(item.address)"
                    target="_blank"
                    class="is-family-code is-size-7"
                    >{{ item.address }}</a
                  >
                </p></b
              >
            </li>
            <li v-for="item in getState('lsp8')" :key="item.address + '_lsp8'">
              <p>
                {{ item.balance }} {{ item.symbol }} of {{ item.name }} (LSP8)
              </p>
              <b>
                <p class="text-center">
                  <a
                    :href="createBlockScoutLink(item.address)"
                    target="_blank"
                    class="is-family-code is-size-7"
                    >{{ item.address }}</a
                  >
                </p></b
              >
            </li>
          </ul>
          <button
            :disabled="!getState('address')"
            class="mt-2 button is-primary is-rounded"
            @click="handleRefresh"
          >
            Refetch Tokens
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notification {
  word-break: break-all;
}

.text-center {
  width: 100%;
  text-align: center;
}
</style>
