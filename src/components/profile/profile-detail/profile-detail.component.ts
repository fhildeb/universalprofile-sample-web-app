import { defineComponent } from "vue";
import { request } from "graphql-request";
import { isAddress } from "ethers/lib/utils";
import { getLSP3ProfileQuery } from "@/helpers/graphql";
import { LSP3Account__factory, LSP3Account } from "@lukso/lsp-factory.js-alpha";
import { getSigner } from "@/services/provider.service";
import { DEFAULT_NETWORK_CONFIG } from "@/helpers/config";

export default defineComponent({
  name: "ProfileDetail",
  props: {
    address: { type: String, default: "" },
  },
  data() {
    return {
      account: {} as LSP3Account,
      dataSource: "",
      loading: true,
      profileData: null,
      error: null,
      uploadTarget: DEFAULT_NETWORK_CONFIG.ipfs.url,
    };
  },
  watch: {
    // call again the method if the route changes
    $route: "fetchData",
  },
  async created() {
    // fetch the data when the view is created and the data is
    // already being observed
    const result = await getSigner();
    if (this.$route.params.address) {
      this.account = new LSP3Account__factory(result.signer).attach(
        this.$route.params.address as string
      );
    }
    this.fetchData();
  },
  methods: {
    fetchData() {
      this.error = this.profileData = null;
      this.loading = true;

      const addressOrHash = this.$route.params.address as string;

      if (isAddress(addressOrHash)) {
        this.getProfileDataFromERC725Cache(addressOrHash);
      } else {
        this.getProfileDataFromIPFS(addressOrHash);
      }
    },

    getProfileDataFromERC725Cache(fetchedAddress: string) {
      request(
        DEFAULT_NETWORK_CONFIG.cache.url,
        getLSP3ProfileQuery(this.$route.params.address as string)
      )
        .then((result) => {
          if (this.$route.params.address !== fetchedAddress) return;
          this.dataSource = "ERC725-Cache";
          this.profileData = result.LSP3UniversalProfiles[0];
          this.loading = false;
        })
        .catch((err) => {
          this.error = err.toString();
        });
    },

    getProfileDataFromIPFS(ipfsHash: string) {
      if (!ipfsHash) {
        return false;
      }

      fetch("https://ipfs.lukso.network/ipfs/" + ipfsHash)
        .then(async (result) => {
          this.dataSource = "IPFS";
          this.profileData = await result.json();
          this.loading = false;
        })
        .catch((err) => {
          this.error = err.toString();
        });
    },
  },
});
